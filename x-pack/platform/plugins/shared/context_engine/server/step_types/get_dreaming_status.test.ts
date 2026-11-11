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
    canRead = true,
    get = jest.fn().mockResolvedValue({ id: 'support', dreaming, traces: [] }),
    source,
  }: {
    contextEngineEnabled?: boolean;
    memoryEnabled?: boolean;
    canRead?: boolean;
    get?: jest.Mock;
    source?: 'memories' | 'traces';
  } = {}) =>
    getDreamingStatusStepDefinition({
      getAiIndexService: () => ({ get } as unknown as AiIndexService),
      isContextEngineEnabled: async () => contextEngineEnabled,
      isMemoryEnabled: async () => memoryEnabled,
      checkReadPrivilege: async () => canRead,
    }).handler(
      createMockStepContext({
        input: { ai_index_id: 'support', ...(source && { source }) },
        esClient: {},
      })
    );

  it('dreams when Context Engine and memory are on and the AI index dreams', async () => {
    await expect(run()).resolves.toEqual({ output: { dream: true } });
  });

  it('fails without reading the AI index when the workflow user cannot read AI indices', async () => {
    const get = jest.fn();

    await expect(run({ canRead: false, get })).rejects.toThrow(
      'Insufficient privileges to read AI indices'
    );
    expect(get).not.toHaveBeenCalled();
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

  it('dreams on traces only for an AI index that dreams and has trace sources', async () => {
    const trace = { type: 'elastic_agent', value: 'elastic-ai-agent', query: 'FROM traces' };

    await expect(
      run({
        source: 'traces',
        get: jest.fn().mockResolvedValue({ id: 'support', dreaming, traces: [trace] }),
      })
    ).resolves.toEqual({ output: { dream: true } });
    await expect(run({ source: 'traces' })).resolves.toEqual({
      output: { dream: false, reason: "AI index 'support' has no trace sources to dream on." },
    });
    await expect(
      run({
        source: 'traces',
        get: jest.fn().mockResolvedValue({
          id: 'support',
          dreaming: { ...dreaming, enabled: false },
          traces: [trace],
        }),
      })
    ).resolves.toEqual({
      output: { dream: false, reason: "Dreaming is not turned on for AI index 'support'." },
    });
    // Memory dreaming does not need trace sources.
    await expect(run()).resolves.toEqual({ output: { dream: true } });
  });

  it('fails on any other error reading the AI index', async () => {
    await expect(run({ get: jest.fn().mockRejectedValue(new Error('boom')) })).rejects.toThrow(
      'boom'
    );
  });
});
