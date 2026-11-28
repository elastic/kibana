/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DatasetDownloadFailedError,
  loadLongMemEvalSuiteData,
  loadVerifiedSource,
} from './dataset';

// A tiny stand-in for the real 277 MB file, so size and checksum verification can pass.
jest.mock('./constants', () => {
  const { createHash } = jest.requireActual('crypto');
  const body = Buffer.from(
    JSON.stringify([
      {
        question_id: 'q1',
        question_type: 'single-session-user',
        question: 'What colour is my bike?',
        question_date: '2023/05/30 (Tue) 20:36',
        answer: 'Red',
        answer_session_ids: ['answer_abc'],
        haystack_session_ids: ['noise_1', 'answer_abc'],
        haystack_dates: ['2023/05/20 (Sat) 10:00', '2023/05/22 (Mon) 21:18'],
        haystack_sessions: [
          [
            { role: 'user', content: 'Hello there' },
            { role: 'assistant', content: 'Hi!' },
          ],
          [
            { role: 'user', content: 'I painted my bike red', has_answer: true },
            { role: 'assistant', content: 'Nice colour.' },
          ],
        ],
      },
    ])
  );
  return {
    ...jest.requireActual('./constants'),
    LONGMEMEVAL_EXAMPLE_COUNT: 1,
    LONGMEMEVAL_SOURCE_BYTES: body.length,
    LONGMEMEVAL_SOURCE_SHA256: createHash('sha256').update(body).digest('hex'),
    MOCK_BODY: body,
  };
});

const body: Buffer = jest.requireMock('./constants').MOCK_BODY;
const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const okResponse = (payload: Buffer) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  arrayBuffer: async () =>
    payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.length),
});
// `readFile` is overloaded (string or Buffer); the cast picks the Buffer form for the mock.
const readFileOnce = (value: Buffer) =>
  jest.spyOn(Fs, 'readFile').mockResolvedValueOnce(value as never);
const readFileAlways = (value: Buffer) =>
  jest.spyOn(Fs, 'readFile').mockResolvedValue(value as never);

const failedResponse = (status: number) => ({ ok: false, status, statusText: 'error' });

describe('loadVerifiedSource', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    delete process.env.LONGMEMEVAL_S_PATH;
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(Fs, 'readFile').mockRejectedValue(new Error('ENOENT'));
    jest.spyOn(Fs, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(Fs, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(Fs, 'rename').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    delete process.env.LONGMEMEVAL_S_PATH;
  });

  it('uses LONGMEMEVAL_S_PATH without downloading, and still verifies it', async () => {
    process.env.LONGMEMEVAL_S_PATH = '/local/copy.json';
    readFileOnce(body);
    await expect(loadVerifiedSource(log)).resolves.toEqual(body);
    expect(fetchMock).not.toHaveBeenCalled();

    readFileOnce(Buffer.from('tampered'));
    await expect(loadVerifiedSource(log)).rejects.toThrow(/size mismatch/);
  });

  it('returns a valid cached copy without downloading', async () => {
    readFileOnce(body);
    await expect(loadVerifiedSource(log)).resolves.toEqual(body);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores a corrupt cache, downloads, and caches through a private temp file', async () => {
    readFileOnce(Buffer.from('corrupt'));
    fetchMock.mockResolvedValueOnce(okResponse(body));

    await expect(loadVerifiedSource(log)).resolves.toEqual(body);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true, mode: 0o700 });
    expect(Fs.rename).toHaveBeenCalledTimes(1);
  });

  it('retries server errors and checksum mismatches, then fails with a typed error', async () => {
    fetchMock
      .mockResolvedValueOnce(failedResponse(503))
      .mockResolvedValueOnce(okResponse(Buffer.from('wrong bytes')))
      .mockResolvedValueOnce(failedResponse(500));

    const result = expect(loadVerifiedSource(log)).rejects.toBeInstanceOf(
      DatasetDownloadFailedError
    );
    await jest.advanceTimersByTimeAsync(60_000);
    await result;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry a client error that retrying cannot fix', async () => {
    fetchMock.mockResolvedValue(failedResponse(404));

    await expect(loadVerifiedSource(log)).rejects.toThrow(/dataset_download_failed.*404/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a rate limit', async () => {
    fetchMock.mockResolvedValueOnce(failedResponse(429)).mockResolvedValueOnce(okResponse(body));

    const result = loadVerifiedSource(log);
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('loadLongMemEvalSuiteData', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.LONGMEMEVAL_S_PATH;
  });

  it('verifies, validates and splits the source into examples and histories', async () => {
    process.env.LONGMEMEVAL_S_PATH = '/local/copy.json';
    readFileAlways(body);

    const { dataset, histories } = await loadLongMemEvalSuiteData({ log, selectedIds: ['q1'] });

    expect(dataset.examples.map(({ id }) => id)).toEqual(['q1']);
    expect([...histories.keys()]).toEqual(['q1']);
    expect(JSON.stringify([...histories.values()])).not.toContain('answer_abc');
  });

  it('rejects an ID that is not in the source', async () => {
    process.env.LONGMEMEVAL_S_PATH = '/local/copy.json';
    readFileAlways(body);

    await expect(loadLongMemEvalSuiteData({ log, selectedIds: ['nope'] })).rejects.toThrow(
      /not found in source: nope/
    );
  });
});
