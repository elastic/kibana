/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { BeforeAgentHookContext, HookHandlerResult } from '@kbn/agent-builder-server';
import { HookLifecycle } from '@kbn/agent-builder-server';
import type { InternalStartServices } from '../../services/types';
import { getCurrentSpaceId } from '../../utils/spaces';

const MIN_SCORE = 0.5;
const RECALL_SIZE = 5;
const CONTENT_PREVIEW_LENGTH = 200;

const MEMORY_INSTRUCTIONS = `\
## MEMORY CONTEXT

The following are memories from past conversations that may be relevant to the current question. \
Treat them as things you remember from previous interactions — refer to them as memories \
("I remember that..." / "In a previous conversation...") rather than as freshly retrieved data \
("I found that..." / "According to the search results...").

You can use \`sml_search\` to search for additional relevant memories, and \`sml_read\` with a \
chunk_id to retrieve the full content of any memory where has_more is true.`;

interface SmlMemoryRecallParams {
  context: BeforeAgentHookContext;
  coreSetup: CoreSetup;
  logger: Logger;
  getInternalServices: () => InternalStartServices;
}

const formatMemoryBlock = (results: Array<{ id: string; origin_id: string; type: string; title: string; score: number; content?: string; attachable: boolean }>): string => {
  const lines: string[] = [MEMORY_INSTRUCTIONS, ''];

  for (const item of results) {
    const content = item.content?.trim() ?? '';
    const hasMore = content.length > CONTENT_PREVIEW_LENGTH;
    const preview = hasMore ? content.slice(0, CONTENT_PREVIEW_LENGTH) + ' …' : content;

    lines.push(
      `### ${item.title}`,
      `chunk_id: ${item.id} | type: ${item.type} | score: ${item.score.toFixed(3)} | has_more: ${hasMore}`
    );
    if (preview) {
      lines.push(preview);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
};

/**
 * Searches SML for conversation memories relevant to the current prompt and
 * prepends them to the user message so the agent can reference them naturally.
 *
 * Results with score < MIN_SCORE are discarded. A failed search never blocks
 * the agent — it logs a warning and returns undefined (no-op).
 */
export const runSmlMemoryRecall = async ({
  context,
  coreSetup,
  logger,
  getInternalServices,
}: SmlMemoryRecallParams): Promise<void | HookHandlerResult<HookLifecycle.beforeAgent>> => {
  const message = context.nextInput.message?.trim();
  if (!message) {
    return;
  }

  const { sml, spaces } = getInternalServices();
  const [coreStart] = await coreSetup.getStartServices();
  const esClient = coreStart.elasticsearch.client.asScoped(context.request).asCurrentUser;
  const spaceId = getCurrentSpaceId({ request: context.request, spaces });

  let filteredResults;
  try {
    const { results } = await sml.search({
      query: message,
      size: RECALL_SIZE,
      spaceId,
      esClient,
      request: context.request,
      type: 'conversation',
    });
    filteredResults = results.filter((r) => r.score >= MIN_SCORE);
  } catch (err) {
    logger.warn(`SML memory recall: search failed — ${(err as Error).message}`);
    return;
  }

  if (filteredResults.length === 0) {
    return;
  }

  const memoryBlock = formatMemoryBlock(filteredResults);
  const newMessage = `${memoryBlock}\n\n---\n\n${message}`;

  return {
    nextInput: { ...context.nextInput, message: newMessage },
  };
};
