/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SmlChunk,
  SmlContext,
  SmlTypeDefinition,
} from '@kbn/agent-context-layer-plugin/server';
import { chatSystemIndex } from '@kbn/agent-builder-server';

const CONVERSATION_SML_TYPE = 'conversation';
const CONVERSATIONS_INDEX = chatSystemIndex('conversations');

const LIST_PAGE_SIZE = 200;
const CONTENT_MAX_LEN = 8000;

/**
 * Subset of the agent_builder conversation document that this SML type relies
 * on. Kept intentionally narrow — we only access the fields needed to build a
 * per-turn chunk and to detect changes in the crawler.
 */
interface ConversationDocSummary {
  user_id?: string;
  user_name?: string;
  space?: string;
  title?: string;
  updated_at?: string;
}

interface ConversationRoundDoc {
  id?: string;
  started_at?: string;
  input?: { message?: string };
  response?: { message?: string };
  steps?: Array<{
    type?: string;
    tool_id?: string;
    reasoning?: string;
  }>;
}

interface ConversationDoc extends ConversationDocSummary {
  conversation_rounds?: ConversationRoundDoc[];
  rounds?: ConversationRoundDoc[];
}

/**
 * SML type that indexes agent_builder conversations as one chunk per round.
 *
 * Each round becomes a chunk whose:
 *   - `createdAt` is the round's `started_at` (so search results are time-relative
 *     to when the user actually had that turn, not when the crawler ran)
 *   - `userId` is the conversation owner's username — search will only return
 *     these chunks to the same user, so conversations stay private.
 *
 * Conversations are not attachable today: `toAttachment` returns `undefined`.
 * They are surfaced through SML *search only*, e.g. for memory-style recall in
 * a new conversation.
 */
export const conversationSmlType: SmlTypeDefinition = {
  id: CONVERSATION_SML_TYPE,
  fetchFrequency: () => '5m',

  async *list(context) {
    const pit = await openPit(context);
    if (!pit) return;

    let searchAfter: Array<string | number> | undefined;
    try {
      while (true) {
        const response = await context.esClient.search<ConversationDocSummary>({
          size: LIST_PAGE_SIZE,
          track_total_hits: false,
          _source: ['user_name', 'space', 'updated_at'],
          query: { match_all: {} },
          pit: { id: pit, keep_alive: '1m' },
          sort: [{ updated_at: 'desc' }, { _shard_doc: 'asc' }],
          ...(searchAfter ? { search_after: searchAfter } : {}),
        });

        const hits = response.hits.hits;
        if (hits.length === 0) break;

        const items = hits
          .filter((hit) => hit._id != null)
          .map((hit) => ({
            id: hit._id!,
            updatedAt: hit._source?.updated_at ?? new Date().toISOString(),
            spaces: hit._source?.space ? [hit._source.space] : ['default'],
          }));

        if (items.length > 0) {
          yield items;
        }

        if (hits.length < LIST_PAGE_SIZE) break;
        searchAfter = hits[hits.length - 1].sort as Array<string | number>;
      }
    } catch (error) {
      context.logger.warn(
        `SML conversation: failed to enumerate conversations: ${(error as Error).message}`
      );
    } finally {
      await closePit(context, pit);
    }
  },

  getSmlData: async (originId, context) => {
    let doc: ConversationDoc | undefined;
    try {
      const response = await context.esClient.get<ConversationDoc>({
        index: CONVERSATIONS_INDEX,
        id: originId,
      });
      doc = response._source;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status !== 404) {
        context.logger.warn(
          `SML conversation: failed to load conversation '${originId}': ${(error as Error).message}`
        );
      }
      return undefined;
    }

    if (!doc) return undefined;

    const rounds = doc.conversation_rounds ?? doc.rounds ?? [];
    if (rounds.length === 0) return { chunks: [] };

    const owner = doc.user_name ?? doc.user_id;
    const title = doc.title ?? originId;

    const chunks: SmlChunk[] = rounds
      .map((round, index) => buildRoundChunk({ round, index, title, owner }))
      .filter((chunk): chunk is SmlChunk => chunk !== undefined);

    return { chunks };
  },

  // Conversation chunks are search-only (memory recall) and are not attachable.
  toAttachment: async () => undefined,
};

const buildRoundChunk = ({
  round,
  index,
  title,
  owner,
}: {
  round: ConversationRoundDoc;
  index: number;
  title: string;
  owner: string | undefined;
}): SmlChunk | undefined => {
  const userMessage = round.input?.message?.trim() ?? '';
  const assistantMessage = round.response?.message?.trim() ?? '';

  if (!userMessage && !assistantMessage) {
    return undefined;
  }

  const reasoningSnippets = (round.steps ?? [])
    .filter((step) => step.type === 'reasoning' && typeof step.reasoning === 'string')
    .map((step) => step.reasoning!.trim())
    .filter(Boolean);

  const toolIds = [
    ...new Set(
      (round.steps ?? [])
        .filter((step) => step.type === 'tool_call' && typeof step.tool_id === 'string')
        .map((step) => step.tool_id!)
    ),
  ];

  const sections: string[] = [];
  if (userMessage) sections.push(`User: ${userMessage}`);
  if (assistantMessage) sections.push(`Assistant: ${assistantMessage}`);
  if (reasoningSnippets.length > 0) {
    sections.push(`Reasoning: ${reasoningSnippets.join('\n')}`);
  }
  if (toolIds.length > 0) {
    sections.push(`Tools used: ${toolIds.join(', ')}`);
  }

  let content = sections.join('\n\n');
  if (content.length > CONTENT_MAX_LEN) {
    content = `${content.slice(0, CONTENT_MAX_LEN)}…`;
  }

  return {
    type: CONVERSATION_SML_TYPE,
    title: `${title} — turn ${index + 1}`,
    content,
    permissions: [],
    createdAt: round.started_at,
    userId: owner,
  };
};

const openPit = async (context: SmlContext): Promise<string | undefined> => {
  try {
    const pit = await context.esClient.openPointInTime({
      index: CONVERSATIONS_INDEX,
      keep_alive: '1m',
      ignore_unavailable: true,
    });
    return pit.id;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404) {
      return undefined;
    }
    context.logger.warn(
      `SML conversation: failed to open PIT on '${CONVERSATIONS_INDEX}': ${
        (error as Error).message
      }`
    );
    return undefined;
  }
};

const closePit = async (context: SmlContext, pitId: string): Promise<void> => {
  try {
    await context.esClient.closePointInTime({ id: pitId });
  } catch (error) {
    context.logger.debug(
      `SML conversation: failed to close PIT: ${(error as Error).message ?? String(error)}`
    );
  }
};
