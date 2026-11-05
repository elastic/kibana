/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { getDreamingStatusStepDefinition } from './get_dreaming_status';
import { createMockStepContext } from './test_utils';

const dreaming = { enabled: true, facts: [{ type: 'preference' }] };

describe('getDreamingStatusStepDefinition', () => {
  const run = ({
    contextEngineEnabled = true,
    memoryEnabled = true,
    get = jest.fn().mockResolvedValue({ id: 'support', dreaming }),
  }: {
    contextEngineEnabled?: boolean;
    memoryEnabled?: boolean;
    get?: jest.Mock;
  } = {}) =>
    getDreamingStatusStepDefinition({
      getAiIndexService: () => ({ get } as unknown as AiIndexService),
      isContextEngineEnabled: async () => contextEngineEnabled,
      isMemoryEnabled: async () => memoryEnabled,
    }).handler(createMockStepContext({ input: { ai_index_id: 'support' }, esClient: {} }));

  it('dreams when Context Engine and memory are on and the AI index dreams', async () => {
    await expect(run()).resolves.toEqual({ output: { dream: true } });
  });

  it('skips the run when the global memory setting is off', async () => {
    await expect(run({ memoryEnabled: false })).resolves.toEqual({
      output: { dream: false, reason: 'The global Context Engine memory setting is off.' },
    });
  });

  it('skips the run when Context Engine is off in the space', async () => {
    await expect(run({ contextEngineEnabled: false })).resolves.toEqual({
      output: { dream: false, reason: 'Context Engine is turned off in this space.' },
    });
  });

  it('skips the run when the AI index no longer dreams or is gone', async () => {
    await expect(
      run({
        get: jest
          .fn()
          .mockResolvedValue({ id: 'support', dreaming: { ...dreaming, enabled: false } }),
      })
    ).resolves.toEqual({
      output: { dream: false, reason: "Dreaming is not turned on for AI index 'support'." },
    });
    await expect(
      run({ get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('support')) })
    ).resolves.toEqual({
      output: { dream: false, reason: "AI index 'support' does not exist." },
    });
  });

  it('fails on any other error reading the AI index', async () => {
    await expect(run({ get: jest.fn().mockRejectedValue(new Error('boom')) })).rejects.toThrow(
      'boom'
    );
  });
});
