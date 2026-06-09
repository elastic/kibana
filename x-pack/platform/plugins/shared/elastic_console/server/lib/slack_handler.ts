/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  agentBuilderDefaultAgentId,
  AgentExecutionMode,
  isMessageChunkEvent,
  isToolCallEvent,
  isToolResultEvent,
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
} from '@kbn/agent-builder-common';
import { createConversationStorage } from './conversation_storage';
import { resolveConnector } from './resolve_connector';
import {
  SLACK_USER_MAPPING_SO_TYPE,
  type SlackUserMappingAttributes,
} from './slack_user_mapping_so';
import {
  SLACK_SESSION_SO_TYPE,
  slackSessionSoId,
  conversationIdFromSoId,
  type SlackSessionAttributes,
} from './slack_session_so';
import {
  postMessage,
  createStreamUpdater,
  splitAtParagraph,
  MAX_SLACK_MSG_LEN,
} from './slack_client';
import { markdownToMrkdwn } from './slack_format';

// ---------------------------------------------------------------------------
// Command patterns
// ---------------------------------------------------------------------------

const FORK_RE = /^fork$/i;
const STATUS_RE = /^status$/i;
const RESET_RE = /^(?:reset|new\s+session)$/i;

// ---------------------------------------------------------------------------
// Dedup guard — prevents processing the same Slack event twice
// (Slack retries events that don't receive a timely 200 response)
// ---------------------------------------------------------------------------

const inFlightEvents = new Set<string>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getSpace = (basePath: string): string => {
  const spaceMatch = basePath.match(/(?:^|\/)s\/([^/]+)/);
  return spaceMatch ? spaceMatch[1] : 'default';
};

/**
 * Find the active conversation for a Slack thread by querying the slack session SO.
 * The SO is stored separately from the conversation document so agentBuilder's
 * full-document replaces cannot overwrite Slack routing metadata.
 */
const findSessionByOriginRef = async (
  coreStart: CoreStart,
  originRef: string,
  logger: Logger
): Promise<{ conversationId: string; session: SlackSessionAttributes } | null> => {
  try {
    const soClient = coreStart.savedObjects.createInternalRepository([SLACK_SESSION_SO_TYPE]);
    const results = await soClient.find<SlackSessionAttributes>({
      type: SLACK_SESSION_SO_TYPE,
      filter: `elastic-console-slack-session.attributes.origin_ref: "${originRef}"`,
      perPage: 1,
      sortField: 'updated_at',
      sortOrder: 'desc',
    });
    if (results.total === 0) return null;
    const so = results.saved_objects[0];
    return {
      conversationId: conversationIdFromSoId(so.id),
      session: so.attributes,
    };
  } catch (err) {
    // A failure here means the thread will be treated as a new conversation — data continuity loss.
    logger.error(
      `Session lookup failed for ${originRef} — thread will start a new conversation: ${
        (err as Error).message
      }`
    );
    return null;
  }
};

const lookupKibanaUser = async (
  coreStart: CoreStart,
  slackUserId: string
): Promise<{ username: string; userId?: string } | null> => {
  try {
    const soClient = coreStart.savedObjects.createInternalRepository([SLACK_USER_MAPPING_SO_TYPE]);
    const so = await soClient.get<SlackUserMappingAttributes>(
      SLACK_USER_MAPPING_SO_TYPE,
      slackUserId
    );
    return { username: so.attributes.kibana_username, userId: so.attributes.kibana_user_id };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Main event handler
// ---------------------------------------------------------------------------

export interface SlackEvent {
  type: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  text?: string;
  user?: string;
}

export const handleSlackEvent = async ({
  event,
  botToken,
  coreStart,
  inference,
  agentBuilder,
  request,
  logger,
}: {
  event: SlackEvent;
  botToken: string;
  coreStart: CoreStart;
  inference: InferenceServerStart;
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<void> => {
  if (event.type !== 'app_mention' && event.type !== 'message') return;

  const channel = event.channel;
  const threadTs = event.thread_ts ?? event.ts;
  const originRef = `slack:${channel}:${threadTs}`;
  const text = (event.text ?? '').replace(/<@\w+>\s*/g, '').trim();

  // Deduplicate: Slack retries events that don't receive a timely response.
  if (inFlightEvents.has(event.ts)) {
    logger.debug(`Dropping duplicate Slack event ${event.ts}`);
    return;
  }
  inFlightEvents.add(event.ts);
  setTimeout(() => inFlightEvents.delete(event.ts), 10 * 60 * 1000);

  if (!text) {
    await postMessage(botToken, {
      channel,
      thread_ts: threadTs,
      text: 'Mention me with a question.',
    });
    return;
  }

  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const basePath = coreStart.http.basePath.get(request);
  const space = getSpace(basePath);
  const storage = createConversationStorage({ esClient, logger });
  const soClient = coreStart.savedObjects.createInternalRepository([SLACK_SESSION_SO_TYPE]);

  // Resolve the Kibana user identity for this Slack user so conversations are
  // attributed correctly and visible to the user across all surfaces.
  const kibanaUser = event.user ? await lookupKibanaUser(coreStart, event.user) : null;

  try {
    // --- Command: status ---
    if (STATUS_RE.test(text)) {
      const existing = await findSessionByOriginRef(coreStart, originRef, logger);
      const lines = ['*Elastic Console — session status*'];
      if (existing) {
        const { session } = existing;
        lines.push(`• Conversation: active`);
        if (session.location) lines.push(`• Location: \`${session.location}\``);
        if (session.located_at) {
          const ageMs = Date.now() - new Date(session.located_at).getTime();
          const ageStr =
            ageMs < 60_000
              ? 'just now'
              : ageMs < 3_600_000
              ? `${Math.floor(ageMs / 60_000)}m ago`
              : `${Math.floor(ageMs / 3_600_000)}h ago`;
          lines.push(`• Last activity: ${ageStr}`);
        }
      } else {
        lines.push('• No active session in this thread.');
      }
      await postMessage(botToken, { channel, thread_ts: threadTs, text: lines.join('\n') });
      return;
    }

    // --- Command: reset ---
    if (RESET_RE.test(text)) {
      const existing = await findSessionByOriginRef(coreStart, originRef, logger);
      if (existing) {
        const { conversationId, session } = existing;
        const fullConv = await storage.get({ id: conversationId });
        if (fullConv.found && fullConv._source) {
          await storage.index({
            id: conversationId,
            document: {
              ...fullConv._source,
              conversation_rounds: [],
              updated_at: new Date().toISOString(),
            },
          });
        }
        const now = new Date().toISOString();
        await soClient.update<SlackSessionAttributes>(
          SLACK_SESSION_SO_TYPE,
          slackSessionSoId(conversationId),
          { location: originRef, located_at: now, updated_at: now, fork_context: null }
        );
        // If the SO doesn't exist (race), fall through — session was already reset
        void session; // suppress unused warning
      }
      await postMessage(botToken, { channel, thread_ts: threadTs, text: 'Session reset.' });
      return;
    }

    // --- Command: fork ---
    if (FORK_RE.test(text)) {
      const existing = await findSessionByOriginRef(coreStart, originRef, logger);
      if (!existing) {
        await postMessage(botToken, {
          channel,
          thread_ts: threadTs,
          text: 'Cannot fork: no active session in this thread.',
        });
        return;
      }

      const { conversationId, session } = existing;
      const fullConv = await storage.get({ id: conversationId });
      if (!fullConv.found) {
        await postMessage(botToken, {
          channel,
          thread_ts: threadTs,
          text: 'Cannot fork: session not found.',
        });
        return;
      }

      const parentSource = fullConv._source;
      if (!parentSource) {
        await postMessage(botToken, {
          channel,
          thread_ts: threadTs,
          text: 'Cannot fork: session not found.',
        });
        return;
      }

      const rounds = parentSource.conversation_rounds ?? [];
      if (rounds.length === 0) {
        await postMessage(botToken, {
          channel,
          thread_ts: threadTs,
          text: 'Cannot fork: no conversation history yet.',
        });
        return;
      }

      const forkId = uuidv4();
      const now = new Date().toISOString();

      // Create a child conversation pre-seeded with parent history so the CLI
      // has full context. After handoff the summary is posted back to this
      // Slack thread and the parent conversation continues as normal.
      await storage.index({
        id: forkId,
        document: {
          agent_id: parentSource.agent_id,
          title: `[Investigation] ${parentSource.title ?? conversationId}`,
          conversation_rounds: rounds,
          user_id: parentSource.user_id,
          user_name: parentSource.user_name,
          space,
          created_at: now,
          updated_at: now,
        },
      });

      // fork_context stores the parent round count so the handoff notification
      // only shows rounds added during the investigation, not the inherited history.
      await soClient.create<SlackSessionAttributes>(
        SLACK_SESSION_SO_TYPE,
        {
          origin_ref: originRef,
          origin_location: originRef,
          location: null,
          connector_id: session.connector_id,
          fork_context: String(rounds.length),
          handoff_summary: null,
          located_at: null,
          updated_at: now,
        },
        { id: slackSessionSoId(forkId), overwrite: true }
      );

      const kibanaBase = coreStart.http.basePath.publicBaseUrl ?? '';
      const kibanaConvUrl = `${kibanaBase}/app/agent-builder/conversations/${forkId}`;

      await postMessage(botToken, {
        channel,
        thread_ts: threadTs,
        text: [
          `*Session forked* — \`${forkId}\``,
          ``,
          `Pick up in your editor:`,
          '```',
          `elastic-console fork ${forkId}`,
          '```',
          `Or open in Kibana: ${kibanaConvUrl}`,
        ].join('\n'),
      });
      return;
    }

    // --- Regular question — route through Agent Builder ---

    const existingSession = await findSessionByOriginRef(coreStart, originRef, logger);
    const existingConvId: string | null =
      existingSession && (await storage.get({ id: existingSession.conversationId })).found
        ? existingSession.conversationId
        : null;

    // First message in a new thread from an unmapped Slack user — prompt them to link
    // their Kibana account so the conversation shows up in Agent Builder.
    if (!existingSession && !kibanaUser && event.user) {
      await postMessage(botToken, {
        channel,
        thread_ts: threadTs,
        text: [
          `👋 Hi! Your Slack account isn't linked to a Kibana user yet.`,
          `Your Slack user ID is \`${event.user}\`.`,
          ``,
          `To link your account, open *Elastic Console Setup* in Kibana and enter your Slack user ID in the *Link Slack Account* section.`,
          ``,
          `I'll still answer your question, but the conversation won't appear in Kibana Agent Builder until you link.`,
        ].join('\n'),
      });
    }

    // Post a placeholder and start streaming
    const streamTs = await postMessage(botToken, {
      channel,
      thread_ts: threadTs,
      text: `_Thinking…_`,
    });

    const updater = createStreamUpdater(
      botToken,
      channel,
      streamTs,
      threadTs,
      (err) => logger.warn(`Stream update failed: ${err.message}`),
      (err) =>
        logger.warn(`Stream finalize fell back to new message (original deleted?): ${err.message}`)
    );

    const statusLines: string[] = [];
    const responseChunks: string[] = [];
    const STATUS_VISIBLE = 3;

    const buildStreamText = (): string => {
      let msg = '';
      if (statusLines.length) {
        const hidden = statusLines.length - STATUS_VISIBLE;
        const visible = statusLines.slice(-STATUS_VISIBLE);
        if (hidden > 0) msg += `> _…and ${hidden} earlier step${hidden === 1 ? '' : 's'}_\n`;
        msg += visible.map((l) => `> ${l}`).join('\n') + '\n';
      }
      const partial = responseChunks.join('');
      if (partial) {
        if (statusLines.length) msg += '\n';
        const formatted = markdownToMrkdwn(partial);
        const available = MAX_SLACK_MSG_LEN - msg.length;
        msg +=
          formatted.length > available
            ? formatted.slice(0, Math.max(0, available)) + '…'
            : formatted;
      }
      return msg || `_Thinking…_`;
    };

    // Resolve connector: use the one from the session SO, or fall back to default
    const resolvedConnectorId = await resolveConnector(
      inference,
      request,
      existingSession?.session.connector_id ?? 'default'
    );

    const abortController = new AbortController();
    const handoffSummary = existingSession?.session.handoff_summary;

    // Route the message through Agent Builder's execution service. Unlike a raw
    // LLM completion, this gives the agent access to its tools and persists the
    // exchange as a real Agent Builder conversation (with tool-call steps).
    // We capture the conversation id from the stream so the Slack thread can be
    // mapped back to the AB conversation.
    let conversationId: string | null = existingConvId;
    try {
      const { events$ } = await agentBuilder.execution.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        abortSignal: abortController.signal,
        // Run locally so we can stream events straight to Slack instead of polling.
        useTaskManager: false,
        params: {
          agentId: agentBuilderDefaultAgentId,
          connectorId: resolvedConnectorId,
          ...(existingConvId ? { conversationId: existingConvId } : {}),
          ...(handoffSummary
            ? {
                configurationOverrides: {
                  instructions: `A previous investigation was completed with this summary: "${handoffSummary}". Reference it when relevant.`,
                },
              }
            : {}),
          nextInput: { message: text },
        },
      });

      await new Promise<void>((resolve, reject) => {
        events$.subscribe({
          next: (chatEvent) => {
            if (isMessageChunkEvent(chatEvent)) {
              const chunk = chatEvent.data.text_chunk;
              if (chunk) {
                responseChunks.push(chunk);
                updater.schedule(buildStreamText());
              }
            } else if (isToolCallEvent(chatEvent)) {
              statusLines.push(`🛠️ _Calling \`${chatEvent.data.tool_id}\`_`);
              updater.schedule(buildStreamText());
            } else if (isToolResultEvent(chatEvent)) {
              statusLines.push(`✅ _\`${chatEvent.data.tool_id}\` finished_`);
              updater.schedule(buildStreamText());
            } else if (
              isConversationCreatedEvent(chatEvent) ||
              isConversationUpdatedEvent(chatEvent)
            ) {
              conversationId = chatEvent.data.conversation_id;
            }
          },
          error: reject,
          complete: resolve,
        });
      });
    } catch (agentError) {
      logger.error(`Agent Builder error in Slack handler: ${(agentError as Error).message}`);
      await updater.finalize(`⚠️ Error: ${(agentError as Error).message}`);
      return;
    }

    const responseText = responseChunks.join('');
    const formatted = markdownToMrkdwn(responseText);
    const parts = splitAtParagraph(formatted, MAX_SLACK_MSG_LEN);

    await updater.finalize(parts[0] ?? '_No response_');
    for (const part of parts.slice(1)) {
      await postMessage(botToken, { channel, thread_ts: threadTs, text: part });
    }

    // Agent Builder owns conversation persistence now. We only maintain the Slack
    // session SO mapping the thread to the AB conversation — its existence is also
    // what marks the conversation as "from Slack" in the UI.
    if (!conversationId) {
      logger.error(
        `Agent Builder returned no conversation id for thread ${originRef}; session not linked.`
      );
      return;
    }
    const now = new Date().toISOString();
    try {
      if (existingConvId) {
        await soClient.update<SlackSessionAttributes>(
          SLACK_SESSION_SO_TYPE,
          slackSessionSoId(existingConvId),
          { location: originRef, located_at: now, updated_at: now }
        );
      } else {
        await soClient.create<SlackSessionAttributes>(
          SLACK_SESSION_SO_TYPE,
          {
            origin_ref: originRef,
            origin_location: originRef,
            location: originRef,
            connector_id: resolvedConnectorId,
            fork_context: null,
            handoff_summary: null,
            located_at: now,
            updated_at: now,
          },
          { id: slackSessionSoId(conversationId), overwrite: true }
        );
      }
    } catch (persistErr) {
      logger.error(
        `Failed to persist Slack session for thread ${originRef}: ${(persistErr as Error).message}`
      );
    }
  } catch (error) {
    logger.error(`Slack handler error: ${(error as Error).message}`);
    try {
      await postMessage(botToken, {
        channel,
        thread_ts: threadTs,
        text: `⚠️ Error: ${(error as Error).message}`,
      });
    } catch {
      // best-effort
    }
  }
};
