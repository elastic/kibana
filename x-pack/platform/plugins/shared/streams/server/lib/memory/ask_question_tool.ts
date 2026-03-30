/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryService } from './types';
import type { MemoryQuestionCategory } from './types';

/**
 * Tool definition for the `ask_question` tool, suitable for inclusion in
 * a prompt's `tools` section.
 */
export const askQuestionToolDefinition = {
  description:
    'Ask a question to the human operator when you encounter something unclear, conflicting, ' +
    'or when information is missing that you cannot determine from the available data. ' +
    'The question will be queued for the user to answer later. Use category "quality" for ' +
    'issues with existing content (contradictions, ambiguities, stale information) and ' +
    '"gap" for missing knowledge that would improve the wiki.',
  schema: {
    type: 'object' as const,
    properties: {
      question: {
        type: 'string' as const,
        description: 'The question to ask the human operator',
      },
      category: {
        type: 'string' as const,
        enum: ['quality', 'gap'],
        description: '"quality" for issues with existing content, "gap" for missing knowledge',
      },
      related_page_paths: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Paths of wiki pages related to this question',
      },
      context: {
        type: 'string' as const,
        description: 'Brief explanation of why this question is being asked',
      },
    },
    required: ['question', 'category', 'context'] as const,
  },
} as const;

/**
 * Creates a tool callback for the `ask_question` tool that persists
 * questions via the memory service.
 */
export const createAskQuestionCallback = ({
  memory,
  logger,
  user,
}: {
  memory: MemoryService;
  logger: Logger;
  user: string;
}) => {
  return async (toolCall: {
    function: {
      arguments: {
        question?: string;
        category?: string;
        related_page_paths?: string[];
        context?: string;
      };
    };
  }) => {
    const {
      question,
      category,
      related_page_paths: relatedPagePaths,
      context,
    } = toolCall.function.arguments;

    if (!question || !category || !context) {
      return { response: { error: 'question, category, and context are required' } };
    }

    if (category !== 'quality' && category !== 'gap') {
      return { response: { error: 'category must be "quality" or "gap"' } };
    }

    // Resolve page paths to entry IDs
    const relatedEntryIds: string[] = [];
    for (const path of relatedPagePaths ?? []) {
      const entry = await memory.getByPath({ path });
      if (entry) {
        relatedEntryIds.push(entry.id);
      }
    }

    const created = await memory.createQuestion({
      question,
      category: category as MemoryQuestionCategory,
      relatedEntries: relatedEntryIds,
      context,
      user,
    });

    logger.info(`Question created: "${question}" (category: ${category})`);

    return {
      response: {
        success: true,
        question_id: created.id,
        related_entries_resolved: relatedEntryIds.length,
      },
    };
  };
};
