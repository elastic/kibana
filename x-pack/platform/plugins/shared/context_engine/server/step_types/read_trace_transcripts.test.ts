/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../dreaming/trace_rounds');

import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { readTraceTranscripts } from '../dreaming/trace_rounds';
import type { DreamingStepDependencies } from './helpers';
import { getReadTraceTranscriptsStepDefinition } from './read_trace_transcripts';
import { createMockStepContext } from './test_utils';

const NOW = new Date('2026-11-11T13:20:00.000Z');
const traces = [{ type: 'elastic_agent', value: 'elastic-ai-agent', query: 'FROM traces' }];
const input = { ai_index_id: 'support', since: '2026-11-11T12:00:00.000Z' };
const read = { memories: [], resume_from: '2026-11-11T13:15:00.000Z', sources: [], skipped: 0 };

describe('readTraceTranscripts step', () => {
  let get: jest.Mock;
  let canRead: boolean;
  let memoryEnabled: boolean;
  const esClient = { search: jest.fn() };

  const run = (stepInput: Record<string, unknown> = input) =>
    getReadTraceTranscriptsStepDefinition(
      {
        getAiIndexService: () => ({ get } as unknown as AiIndexService),
        isContextEngineEnabled: async () => true,
        isMemoryEnabled: async () => memoryEnabled,
        checkReadPrivilege: async () => canRead,
      } as DreamingStepDependencies,
      { getCurrentDate: () => NOW }
    ).handler(createMockStepContext({ input: stepInput, esClient, spaceId: 'team-a' }));

  beforeEach(() => {
    jest.clearAllMocks();
    canRead = true;
    memoryEnabled = true;
    get = jest.fn().mockResolvedValue({ id: 'support', traces });
    jest.mocked(readTraceTranscripts).mockResolvedValue(read);
  });

  it("reads the AI index's trace sources as the workflow user, up to the settle time", async () => {
    await expect(run({ ...input, after: 'trace-1', size: 20 })).resolves.toEqual({ output: read });
    expect(readTraceTranscripts).toHaveBeenCalledWith({
      esClient,
      traces,
      spaceId: 'team-a',
      since: input.since,
      after: 'trace-1',
      until: '2026-11-11T13:15:00.000Z',
      size: 20,
    });
  });

  it('takes the settle time it is given, and reads from since without an after', async () => {
    await run({ ...input, after: '', settle_minutes: 0 });
    expect(readTraceTranscripts).toHaveBeenCalledWith(
      expect.not.objectContaining({ after: expect.anything() })
    );
    expect(jest.mocked(readTraceTranscripts).mock.calls[0][0].until).toBe(NOW.toISOString());
  });

  it('reads nothing, keeping the cursor, without trace sources or while memory is off', async () => {
    get.mockResolvedValue({ id: 'support', traces: [] });
    const empty = { output: { memories: [], resume_from: input.since, sources: [], skipped: 0 } };
    await expect(run()).resolves.toEqual(empty);
    memoryEnabled = false;
    await expect(run()).resolves.toEqual(empty);
    expect(readTraceTranscripts).not.toHaveBeenCalled();
  });

  it('fails without the Context Engine read privilege, or for an AI index that is gone', async () => {
    canRead = false;
    await expect(run()).rejects.toThrow('Insufficient privileges to read AI indices');
    canRead = true;
    get.mockRejectedValue(new AiIndexNotFoundError('support'));
    await expect(run()).rejects.toThrow("AI index 'support' not found");
  });
});
