/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryUpdateTrigger } from './types';

export const KI_DELETED_TRIGGER_ID = 'ki-deleted';

/**
 * Trigger that fires when a user deletes a Knowledge Indicator.
 * Reviews memory entries that may reference the deleted KI and creates
 * open questions so users can decide how to update those entries.
 *
 * Expected payload: { kiId: string; kiTitle: string; streamName?: string }
 */
export const kiDeletedTrigger: MemoryUpdateTrigger = {
  id: KI_DELETED_TRIGGER_ID,
  description:
    'Fires when a Knowledge Indicator is deleted. Reviews and updates memory entries that reference the deleted KI.',
  execute: async (context) => {
    const { memory, spaceId, logger, trigger } = context;
    const { kiTitle, streamName } = trigger.payload as {
      kiId: string;
      kiTitle: string;
      streamName?: string;
    };

    const searchQuery = kiTitle || (streamName ?? '');
    if (!searchQuery) {
      logger.debug('No search query for KI deletion trigger, skipping');
      return;
    }

    const results = await memory.search({
      query: searchQuery,
      space: spaceId,
      size: 10,
    });

    if (results.length === 0) {
      logger.debug(`No memory entries reference deleted KI "${kiTitle}"`);
      return;
    }

    logger.info(
      `Found ${results.length} memory entries potentially referencing deleted KI "${kiTitle}" — creating review questions`
    );

    for (const result of results) {
      await memory.createQuestion({
        question: `The knowledge indicator "${kiTitle}" was deleted${
          streamName ? ` from stream "${streamName}"` : ''
        }. This memory entry may reference it — should the entry be updated or removed?`,
        category: 'quality',
        relatedEntries: [result.id],
        context: `Memory entry "${result.title}" (${result.path}) scored ${result.score.toFixed(
          2
        )} when searching for the deleted KI. Snippet: ${result.snippet}`,
        space: spaceId,
        user: 'system:ki-deleted-trigger',
      });
    }

    logger.info(
      `Created ${results.length} review questions for entries referencing deleted KI "${kiTitle}"`
    );
  },
};
