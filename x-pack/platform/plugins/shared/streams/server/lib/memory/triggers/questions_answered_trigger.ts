/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryUpdateTrigger } from './types';

export const QUESTIONS_ANSWERED_TRIGGER_ID = 'questions-answered';

/**
 * Trigger that fires when a user answers open questions on the memory page.
 * Uses the LLM to integrate the answer into the related memory entries.
 *
 * Expected payload: { questionId: string; question: string; answer: string; relatedEntryIds: string[] }
 */
export const questionsAnsweredTrigger: MemoryUpdateTrigger = {
  id: QUESTIONS_ANSWERED_TRIGGER_ID,
  description:
    'Fires when a user answers open questions about memory state. Incorporates the answers into relevant memory entries.',
  execute: async (context) => {
    const { memory, spaceId, logger, trigger, output } = context;
    const { question, answer, relatedEntryIds } = trigger.payload as {
      questionId: string;
      question: string;
      answer: string;
      relatedEntryIds: string[];
    };

    if (!answer || answer.trim().length === 0) {
      logger.debug('Empty answer provided, skipping');
      return;
    }

    if (!relatedEntryIds || relatedEntryIds.length === 0) {
      logger.debug('No related entries for answered question, skipping');
      return;
    }

    if (!output) {
      logger.debug(
        'No LLM output function available — cannot integrate answer into memory entries'
      );
      return;
    }

    logger.info(`Processing answer for ${relatedEntryIds.length} related memory entries`);

    for (const entryId of relatedEntryIds) {
      try {
        const entry = await memory.get({ id: entryId, space: spaceId });

        const prompt = [
          "You are updating a wiki-style memory entry based on a user's answer to a question.",
          '',
          `## Question that was asked`,
          question,
          '',
          `## User's answer`,
          answer,
          '',
          `## Current entry content`,
          `Title: ${entry.title}`,
          `Path: ${entry.path}`,
          '```',
          entry.content,
          '```',
          '',
          '## Instructions',
          "Incorporate the user's answer into the entry content. Preserve the existing structure",
          'and style. If the answer indicates the entry should be removed or is no longer relevant,',
          'respond with exactly: ENTRY_SHOULD_BE_DELETED',
          '',
          'Otherwise, respond with the updated entry content only (no wrapping markdown fences).',
        ].join('\n');

        const updatedContent = await output(prompt);

        if (updatedContent.includes('ENTRY_SHOULD_BE_DELETED')) {
          await memory.delete({
            id: entryId,
            space: spaceId,
            user: 'system:questions-answered-trigger',
          });
          logger.debug(`Deleted entry ${entryId} based on user answer`);
        } else if (updatedContent.trim().length > 0) {
          await memory.update({
            id: entryId,
            content: updatedContent.trim(),
            space: spaceId,
            user: 'system:questions-answered-trigger',
            changeSummary: `Updated based on answered question: "${question}"`,
          });
          logger.debug(`Updated entry ${entryId} based on user answer`);
        }
      } catch (error) {
        logger.warn(
          `Failed to process entry ${entryId} for answered question: ${(error as Error).message}`
        );
      }
    }
  },
};
