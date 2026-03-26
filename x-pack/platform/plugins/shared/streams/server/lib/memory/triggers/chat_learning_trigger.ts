/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryUpdateTrigger } from './types';

export const CHAT_LEARNING_TRIGGER_ID = 'chat-learning';

interface Learning {
  path: string;
  title: string;
  content: string;
  action: 'create' | 'update';
}

/**
 * Trigger that fires after significant chat interactions where the agent
 * may have learned something new worth persisting to memory.
 *
 * Expected payload: { conversationId: string; agentId?: string; summary: string }
 */
export const chatLearningTrigger: MemoryUpdateTrigger = {
  id: CHAT_LEARNING_TRIGGER_ID,
  description:
    'Fires after significant chat interactions. Extracts new learnings and persists them to memory.',
  execute: async (context) => {
    const { memory, logger, trigger, output } = context;
    const { conversationId, summary } = trigger.payload as {
      conversationId: string;
      agentId?: string;
      summary: string;
    };

    if (!conversationId) {
      logger.debug('No conversation ID provided, skipping');
      return;
    }

    if (typeof summary !== 'string' || summary.trim().length === 0) {
      logger.debug('No conversation summary provided, skipping');
      return;
    }

    if (!output) {
      logger.debug('No LLM output function available — cannot extract learnings');
      return;
    }

    logger.info(`Processing chat learning from conversation ${conversationId}`);

    const tree = await memory.getTree();

    const learningPrompt = [
      'Based on this conversation summary, identify any new facts, corrections, or insights',
      'that should be stored in the shared memory knowledge base.',
      '',
      '## Conversation summary',
      summary,
      '',
      'For each learning, provide:',
      '- path: a wiki path (e.g. "ops/runbooks/deploy-checklist")',
      '- title: a concise title',
      '- content: markdown content summarizing the learning',
      '- action: "create" for new entries, "update" for corrections to existing entries',
      '',
      tree.length > 0
        ? `Current memory has ${tree.length} top-level entries. Check if your learnings overlap with existing content.`
        : 'Memory is currently empty — focus on foundational knowledge.',
      '',
      'If there is nothing worth remembering, respond with: NO_LEARNINGS',
      '',
      'Respond as a JSON array of objects with {path, title, content, action} fields,',
      'or the string NO_LEARNINGS.',
    ].join('\n');

    const responseText = await output(learningPrompt);

    if (responseText.includes('NO_LEARNINGS') || responseText.trim().length < 10) {
      logger.debug(`No learnings identified from conversation ${conversationId}`);
      return;
    }

    const learnings = parseLearnings(responseText);
    const user = 'system:chat-learning-trigger';

    for (const learning of learnings) {
      try {
        const existing = await memory.getByPath({
          path: learning.path,
        });

        if (existing && learning.action === 'update') {
          await memory.update({
            id: existing.id,
            content: learning.content,
            title: learning.title,
            user,
            changeSummary: `Updated via chat learning from conversation ${conversationId}`,
          });
        } else if (!existing && learning.action === 'create') {
          await memory.create({
            path: learning.path,
            title: learning.title,
            content: learning.content,
            tags: ['auto-learned'],
            user,
          });
        }
      } catch (error) {
        logger.warn(`Failed to persist learning at ${learning.path}: ${(error as Error).message}`);
      }
    }

    logger.debug(`Processed ${learnings.length} learnings from conversation ${conversationId}`);
  },
};

const parseLearnings = (text: string): Learning[] => {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is Learning =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.path === 'string' &&
        typeof item.title === 'string' &&
        typeof item.content === 'string' &&
        (item.action === 'create' || item.action === 'update')
    );
  } catch {
    return [];
  }
};
