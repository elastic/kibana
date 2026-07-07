/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryService } from './types';

/**
 * Format memory entries as a summary string for LLM context.
 */
export const formatExistingPages = (
  entries: Array<{ name: string; title: string; categories: string[] }>
): string => {
  if (entries.length === 0) return 'No existing pages.';
  return entries
    .map((e) => `- **${e.name}** — ${e.title} [categories: ${e.categories.join(', ')}]`)
    .join('\n');
};

/**
 * Create a read_memory_page tool callback for use with executeAsReasoningAgent.
 */
export const createReadMemoryPageCallback = ({ memory }: { memory: MemoryService }) => {
  return async (toolCall: { function: { arguments: { name: string } } }) => {
    const { name } = toolCall.function.arguments;
    const entry = await memory.getByName({ name });
    if (!entry) {
      return { response: { error: `No page found with name "${name}"` } };
    }
    return {
      response: {
        id: entry.id,
        name: entry.name,
        title: entry.title,
        content: entry.content,
        categories: entry.categories,
        references: entry.references,
      },
    };
  };
};

/**
 * Create a write_memory_page tool callback for use with executeAsReasoningAgent.
 */
export const createWriteMemoryPageCallback = ({
  memory,
  user,
  logger,
  changeSummary,
}: {
  memory: MemoryService;
  user: string;
  logger: Logger;
  changeSummary: string;
}) => {
  return async (toolCall: {
    function: {
      arguments: {
        name: string;
        title: string;
        content: string;
        categories?: string[];
        references?: string[];
        tags?: string[];
      };
    };
  }) => {
    const { name, title, content, categories, references, tags } = toolCall.function.arguments;

    const existing = await memory.getByName({ name });

    if (existing) {
      await memory.update({
        id: existing.id,
        content,
        title,
        categories,
        references,
        tags,
        user,
        changeSummary,
      });
      logger.info(`Updated wiki page: ${name}`);
    } else {
      await memory.create({
        name,
        title,
        content,
        categories: categories ?? [],
        references: references ?? [],
        tags: [...(tags ?? []), 'auto-generated'],
        user,
      });
      logger.info(`Created wiki page: ${name}`);
    }

    return {
      response: {
        success: true,
        action: existing ? 'updated' : 'created',
        name,
      },
    };
  };
};
