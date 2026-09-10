/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { MemoryToolsOptions } from '../../../memory_and_investigation/tools/memory';
import { createKIQueryGenerationSkill } from '.';

describe('createKIQueryGenerationSkill', () => {
  it('binds query-generation tools inline', () => {
    const skill = createKIQueryGenerationSkill({
      getScopedClients: jest.fn(),
      server: {},
      logger: loggerMock.create(),
    } as unknown as MemoryToolsOptions);

    expect(skill.getInlineTools?.()).toEqual([
      expect.objectContaining({ id: 'platform_sig_events_ki_stream_features_get' }),
      expect.objectContaining({ id: 'platform_sig_events_ki_queries_validate' }),
    ]);
    expect(skill.getRegistryTools).toBeUndefined();
  });
});
