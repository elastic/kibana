/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { MessageRole, ChatCompletionEventType, type Message } from '@kbn/inference-common';
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
      `Session lookup failed for ${originRef} — thread will start a new conversation: ${(err as Error).message}`
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
  request,
  logger,
}: {
  event: SlackEvent;
  botToken: string;
  coreStart: CoreStart;
  inference: InferenceServerStart;
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
        if (fullConv.found) {
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

      const rounds =
        (fullConv._source?.conversation_rounds as Array<Record<string, unknown>>) ?? [];
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
          agent_id: fullConv._source?.agent_id,
          title: `[Investigation] ${(fullConv._source?.title as string) ?? conversationId}`,
          conversation_rounds: rounds,
          user_id: fullConv._source?.user_id,
          user_name: fullConv._source?.user_name,
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

    // --- Regular question — find or create conversation, call inference ---

    const existingSession = await findSessionByOriginRef(coreStart, originRef, logger);
    let existingConvId: string | null = null;
    let existingRounds: Array<Record<string, unknown>> = [];

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

    if (existingSession) {
      const fullConv = await storage.get({ id: existingSession.conversationId });
      if (fullConv.found) {
        existingConvId = existingSession.conversationId;
        existingRounds =
          (fullConv._source?.conversation_rounds as Array<Record<string, unknown>>) ?? [];
      }
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
      (err) => logger.warn(`Stream finalize fell back to new message (original deleted?): ${err.message}`)
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

    // Build full message history so the LLM has conversation context.
    // The inference plugin is a raw LLM interface — it doesn't load conversation
    // history itself, so we pass all prior rounds as messages.
    const historyMessages = existingRounds.flatMap((round) => {
      const input = (round.input as Record<string, unknown> | undefined)?.message as
        | string
        | undefined;
      const responseMsg = (round.response as Record<string, unknown> | undefined)?.message as
        | string
        | undefined;
      const msgs: Message[] = [];
      if (input) msgs.push({ role: MessageRole.User, content: input });
      if (responseMsg) msgs.push({ role: MessageRole.Assistant, content: responseMsg } as Message);
      return msgs;
    });

    // Call inference plugin directly via Observable
    const inferenceClient = inference.getClient({ request });
    const abortController = new AbortController();

    let responseText = '';

    try {
      await new Promise<void>((resolve, reject) => {
        const handoffSummary = existingSession?.session.handoff_summary;
        const systemPrompt =
          'You are a helpful Elastic AI assistant embedded in Slack. ' +
          'Use the full conversation history when answering questions.' +
          (handoffSummary
            ? ` A previous investigation was completed with this summary: "${handoffSummary}". Reference it when relevant.`
            : '');

        const events$ = inferenceClient.chatComplete({
          connectorId: resolvedConnectorId,
          system: systemPrompt,
          messages: [...historyMessages, { role: MessageRole.User, content: text }],
          stream: true,
          abortSignal: abortController.signal,
        });

        events$.subscribe({
          next: (chunk) => {
            if (chunk.type === ChatCompletionEventType.ChatCompletionChunk) {
              const content = (chunk as { type: string; content: string }).content ?? '';
              if (content) {
                responseChunks.push(content);
                updater.schedule(buildStreamText());
              }
              const toolCalls = (
                chunk as { type: string; tool_calls?: Array<{ function?: { name: string } }> }
              ).tool_calls;
              if (toolCalls?.length) {
                const toolName = toolCalls[0]?.function?.name ?? 'tool';
                statusLines.push(`🛠️ _Calling \`${toolName}\`_`);
                updater.schedule(buildStreamText());
              }
            }
          },
          error: reject,
          complete: resolve,
        });
      });
    } catch (inferenceError) {
      logger.error(`Inference error in Slack handler: ${(inferenceError as Error).message}`);
      await updater.finalize(`⚠️ Error: ${(inferenceError as Error).message}`);
      return;
    }

    responseText = responseChunks.join('');

    const formatted = markdownToMrkdwn(responseText);
    const parts = splitAtParagraph(formatted, MAX_SLACK_MSG_LEN);

    await updater.finalize(parts[0] ?? '_No response_');
    for (const part of parts.slice(1)) {
      await postMessage(botToken, { channel, thread_ts: threadTs, text: part });
    }

    // Persist the conversation round and update session SO.
    // Failure here means the user received a response but the round was not saved — log as error.
    const now = new Date().toISOString();
    try {
      if (existingConvId) {
        const existing = await storage.get({ id: existingConvId });
        if (existing.found) {
          const rounds =
            (existing._source?.conversation_rounds as Array<Record<string, unknown>>) ?? [];
          await storage.index({
            id: existingConvId,
            document: {
              ...existing._source,
              conversation_rounds: [
                ...rounds,
                {
                  id: `round-${uuidv4()}`,
                  status: 'completed',
                  input: { message: text },
                  steps: [],
                  response: { message: responseText },
                  started_at: now,
                  time_to_first_token: 0,
                  time_to_last_token: 0,
                  model_usage: {
                    connector_id: resolvedConnectorId,
                    llm_calls: 1,
                    input_tokens: 0,
                    output_tokens: 0,
                  },
                },
              ],
              updated_at: now,
            },
          });
          // Update session SO location — stored outside the conversation doc so agentBuilder
          // full-document replaces can't overwrite it.
          await soClient.update<SlackSessionAttributes>(
            SLACK_SESSION_SO_TYPE,
            slackSessionSoId(existingConvId),
            { location: originRef, located_at: now, updated_at: now }
          );
        }
      } else {
        // Create new conversation document and session SO
        const newConvId = uuidv4();
        await storage.index({
          id: newConvId,
          document: {
            agent_id: 'elastic-ai-agent',
            title: text.slice(0, 100),
            conversation_rounds: [
              {
                id: `round-${uuidv4()}`,
                status: 'completed',
                input: { message: text },
                steps: [],
                response: { message: responseText },
                started_at: now,
                time_to_first_token: 0,
                time_to_last_token: 0,
                model_usage: {
                  connector_id: resolvedConnectorId,
                  llm_calls: 1,
                  input_tokens: 0,
                  output_tokens: 0,
                },
              },
            ],
            user_id: kibanaUser?.userId,
            user_name: kibanaUser?.username,
            space,
            created_at: now,
            updated_at: now,
          },
        });
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
          { id: slackSessionSoId(newConvId), overwrite: true }
        );
      }
    } catch (persistErr) {
      // Response was already sent to Slack — this is a data loss scenario.
      logger.error(
        `Failed to persist conversation round for thread ${originRef}: ${(persistErr as Error).message}`
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
