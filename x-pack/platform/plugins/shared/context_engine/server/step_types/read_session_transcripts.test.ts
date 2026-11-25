/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../dreaming/session_transcripts');

import { DEFAULT_SESSION_TRANSCRIPTS_READ_SIZE } from '../../common/step_types/read_session_transcripts';
import { DEFAULT_TRANSCRIPTS_READ_TOKENS } from '../../common/step_types/dreaming_memory';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { readSessionTranscripts } from '../dreaming/session_transcripts';
import type { SessionEventsService } from '../session_events/types';
import type { SessionMemoryService } from '../session_memory/types';
import { getReadSessionTranscriptsStepDefinition } from './read_session_transcripts';
import { createMockStepContext } from './test_utils';

const NOW = new Date('2026-11-11T13:20:00.000Z');
const input = { ai_index_id: 'support', since: '2026-11-11T12:00:00.000Z' };
const read = { memories: [], resume_from: '2026-11-11T13:15:00.000Z', skipped: 0 };

describe('readSessionTranscripts step', () => {
  const sessionEvents = {} as SessionEventsService;
  let get: jest.Mock;
  let canRead: boolean;
  let memoryEnabled: boolean;

  const run = (stepInput: Record<string, unknown> = input) =>
    getReadSessionTranscriptsStepDefinition(
      {
        getAiIndexService: () => ({ get } as unknown as AiIndexService),
        isContextEngineEnabled: async () => true,
        isMemoryEnabled: async () => memoryEnabled,
        checkReadPrivilege: async () => canRead,
        getSessionMemoryService: async () => ({} as SessionMemoryService),
        getSessionEventsService: async () => sessionEvents,
      },
      { getCurrentDate: () => NOW }
    ).handler(createMockStepContext({ input: stepInput, esClient: {}, spaceId: 'team-a' }));

  beforeEach(() => {
    jest.clearAllMocks();
    canRead = true;
    memoryEnabled = true;
    get = jest.fn().mockResolvedValue({ id: 'support' });
    jest.mocked(readSessionTranscripts).mockResolvedValue(read);
  });

  it('reads the session events of the AI index in the space, up to the settle time', async () => {
    await expect(run({ ...input, after: '["s","e"]', size: 20 })).resolves.toEqual({
      output: { ...read, batches: [] },
    });
    expect(readSessionTranscripts).toHaveBeenCalledWith({
      sessionEvents,
      spaceId: 'team-a',
      aiIndexId: 'support',
      since: input.since,
      after: '["s","e"]',
      until: '2026-11-11T13:15:00.000Z',
      size: 20,
      maxTokens: DEFAULT_TRANSCRIPTS_READ_TOKENS,
    });
  });

  it('reads from since without an after, a default size, and takes the settle time it is given', async () => {
    await run({ ...input, settle_minutes: 0 });

    expect(readSessionTranscripts).toHaveBeenCalledWith(
      expect.objectContaining({
        until: NOW.toISOString(),
        size: DEFAULT_SESSION_TRANSCRIPTS_READ_SIZE,
      })
    );
    expect(jest.mocked(readSessionTranscripts).mock.calls[0][0]).not.toHaveProperty('after');
  });

  it('batches the turns it read by session, up to the batch budget', async () => {
    const turn = (id: string, session: string) => ({
      id,
      type: 'session.turn',
      title: '',
      content: 'x'.repeat(400),
      updated_at: '2026-11-11T13:00:00.000Z',
      attributes: { 'session.id': session },
      permissions: { kibana: { privileges: [{ space: 'team-a' }] } },
    });
    jest.mocked(readSessionTranscripts).mockResolvedValue({
      ...read,
      memories: [turn('a1', 'a'), turn('b1', 'b'), turn('a2', 'a')],
    });

    const result = await run({ ...input, batch_tokens: 200 });

    expect(result.output?.batches.map((batch) => batch.map(({ id }) => id))).toEqual([
      ['a1', 'a2'],
      ['b1'],
    ]);
  });

  it('reads nothing, keeping the cursor, while memory is off', async () => {
    memoryEnabled = false;

    await expect(run()).resolves.toEqual({
      output: { memories: [], batches: [], resume_from: input.since, skipped: 0 },
    });
    expect(readSessionTranscripts).not.toHaveBeenCalled();
  });

  it('fails without the Context Engine read privilege, or for an AI index that is gone', async () => {
    canRead = false;
    await expect(run()).rejects.toThrow('Insufficient privileges to read AI indices');

    canRead = true;
    get.mockRejectedValue(new AiIndexNotFoundError('support'));
    await expect(run()).rejects.toThrow("AI index 'support' not found");
    expect(readSessionTranscripts).not.toHaveBeenCalled();
  });
});
