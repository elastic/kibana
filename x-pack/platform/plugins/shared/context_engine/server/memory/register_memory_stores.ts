/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LONG_TERM_MEMORY_AI_INDEX_ID,
  LONG_TERM_MEMORY_INDEX,
  MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS,
  SHORT_TERM_MEMORY_AI_INDEX_ID,
  SHORT_TERM_MEMORY_DATA_STREAM,
} from '../../common/memory';
import type { AiIndexRegistry } from '../ai_indices/registry';

/** Registers the short-term and long-term memory stores. Both are hidden while memory is off. */
export const registerMemoryStores = ({
  registry,
  isMemoryEnabled,
}: {
  registry: AiIndexRegistry;
  isMemoryEnabled: () => Promise<boolean>;
}): void => {
  registry.register(
    SHORT_TERM_MEMORY_AI_INDEX_ID,
    {
      description: `Short-term memory: what agents and users chose to remember during their sessions. Each memory expires within ${MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS} days.`,
      dest: { type: 'data_stream', value: SHORT_TERM_MEMORY_DATA_STREAM },
      automations: [],
      sources: [],
      traces: [],
    },
    { isAvailable: isMemoryEnabled }
  );
  registry.register(
    LONG_TERM_MEMORY_AI_INDEX_ID,
    {
      description:
        'Long-term memory: lasting knowledge, such as facts, that dreaming distills from short-term memory.',
      dest: { type: 'index', value: LONG_TERM_MEMORY_INDEX },
      automations: [],
      sources: [],
      traces: [],
    },
    { isAvailable: isMemoryEnabled }
  );
};
