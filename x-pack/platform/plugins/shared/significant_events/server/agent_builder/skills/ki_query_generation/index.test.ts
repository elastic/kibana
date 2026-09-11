/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { MemoryToolsOptions } from '../../../memory_and_investigation/tools/memory';
import { platformStreamsMemoryTools } from '../../../memory_and_investigation/tools/memory/tool_ids';
import { SIGNIFICANT_EVENTS_GET_FEATURES_TOOL_ID } from './get_features/tool';
import { SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID } from './validate_queries/tool';
import { WRITE_QUERIES_TOOL_ID } from './write_queries/tool';
import { createKIQueryGenerationSkill } from '.';

describe('createKIQueryGenerationSkill', () => {
  it('returns query-generation and memory tools as inline tools', () => {
    const skill = createKIQueryGenerationSkill({
      getScopedClients: jest.fn(),
      server: {},
      logger: loggerMock.create(),
    } as unknown as MemoryToolsOptions);

    expect(skill.getInlineTools?.()).toEqual([
      expect.objectContaining({ id: platformStreamsMemoryTools.memorySearch }),
      expect.objectContaining({ id: platformStreamsMemoryTools.memoryRead }),
      expect.objectContaining({ id: platformStreamsMemoryTools.memoryList }),
      expect.objectContaining({ id: SIGNIFICANT_EVENTS_GET_FEATURES_TOOL_ID }),
      expect.objectContaining({ id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID }),
      expect.objectContaining({ id: WRITE_QUERIES_TOOL_ID }),
    ]);
    expect(skill.getRegistryTools).toBeUndefined();
  });
});
