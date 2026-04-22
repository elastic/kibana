/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { waitForLiveQueryComplete } from './poll_live_query_history';

const ACTION_ID = 'action-123';

type RequestFn = KbnClient['request'];
type MockResponse = unknown;

interface Recorded {
  path: string;
  method: string;
}

function makeKbnClient(responses: Array<MockResponse | Error>): {
  kbnClient: KbnClient;
  records: Recorded[];
  get calls(): number;
} {
  let calls = 0;
  const records: Recorded[] = [];
  const request: RequestFn = (async (req: { path: string; method: string }) => {
    records.push({ path: req.path, method: req.method });
    const next = responses[calls];
    calls += 1;
    if (next instanceof Error) throw next;
    if (next === undefined) {
      return { data: { data: { queries: [{ status: 'pending' }] } }, status: 200 } as never;
    }

    return next as never;
  }) as RequestFn;
  const kbnClient = { request } as unknown as KbnClient;

  return {
    kbnClient,
    records,
    get calls() {
      return calls;
    },
  };
}

const ok = (queries: Array<Record<string, unknown>>): MockResponse => ({
  data: { data: { queries } },
  status: 200,
});

class HttpError extends Error {
  constructor(public response: { status: number }) {
    super(`HTTP ${response.status}`);
  }
}

describe('waitForLiveQueryComplete', () => {
  test('returns when queries[0].status === "completed"', async () => {
    const { kbnClient } = makeKbnClient([ok([{ status: 'completed' }])]);
    await expect(
      waitForLiveQueryComplete(kbnClient, ACTION_ID, { timeoutMs: 1_000, pollIntervalMs: 20 })
    ).resolves.toBeUndefined();
  });

  test('returns when queries[0].docs > 0 even if status lags', async () => {
    const { kbnClient } = makeKbnClient([ok([{ status: 'pending', docs: 5 }])]);
    await expect(
      waitForLiveQueryComplete(kbnClient, ACTION_ID, { timeoutMs: 1_000, pollIntervalMs: 20 })
    ).resolves.toBeUndefined();
  });

  test('keeps polling after a 404 until the action materializes', async () => {
    const { kbnClient } = makeKbnClient([
      new HttpError({ status: 404 }),
      ok([{ status: 'completed' }]),
    ]);
    await expect(
      waitForLiveQueryComplete(kbnClient, ACTION_ID, { timeoutMs: 1_000, pollIntervalMs: 10 })
    ).resolves.toBeUndefined();
  });

  test('keeps polling while status stays pending with zero docs', async () => {
    const { kbnClient } = makeKbnClient([
      ok([{ status: 'pending', docs: 0 }]),
      ok([{ status: 'pending', docs: 0 }]),
      ok([{ status: 'completed', docs: 3 }]),
    ]);
    await expect(
      waitForLiveQueryComplete(kbnClient, ACTION_ID, { timeoutMs: 2_000, pollIntervalMs: 10 })
    ).resolves.toBeUndefined();
  });

  test('throws immediately when queries[0].failed > 0', async () => {
    const { kbnClient } = makeKbnClient([ok([{ status: 'pending', failed: 1 }])]);
    await expect(
      waitForLiveQueryComplete(kbnClient, ACTION_ID, { timeoutMs: 1_000, pollIntervalMs: 10 })
    ).rejects.toThrow(/agent-side execution failure/);
  });

  test('throws immediately on 401', async () => {
    const { kbnClient } = makeKbnClient([new HttpError({ status: 401 })]);
    await expect(
      waitForLiveQueryComplete(kbnClient, ACTION_ID, { timeoutMs: 1_000, pollIntervalMs: 10 })
    ).rejects.toThrow(/role lacks/);
  });

  test('gives up after 5xx retry budget exhausts', async () => {
    const { kbnClient } = makeKbnClient([
      new HttpError({ status: 500 }),
      new HttpError({ status: 500 }),
      new HttpError({ status: 500 }),
      new HttpError({ status: 500 }),
    ]);
    await expect(
      waitForLiveQueryComplete(kbnClient, ACTION_ID, { timeoutMs: 5_000, pollIntervalMs: 10 })
    ).rejects.toThrow(/consecutive 5xx/);
  });

  test('prefixes requests with /s/{spaceId} when spaceId is provided', async () => {
    const { kbnClient, records } = makeKbnClient([ok([{ status: 'completed' }])]);
    await waitForLiveQueryComplete(kbnClient, ACTION_ID, {
      timeoutMs: 500,
      pollIntervalMs: 10,
      spaceId: 'custom-space',
    });
    expect(records[0].path).toBe(`/s/custom-space/api/osquery/live_queries/${ACTION_ID}`);
  });

  test('does not add a prefix when spaceId is "default"', async () => {
    const { kbnClient, records } = makeKbnClient([ok([{ status: 'completed' }])]);
    await waitForLiveQueryComplete(kbnClient, ACTION_ID, {
      timeoutMs: 500,
      pollIntervalMs: 10,
      spaceId: 'default',
    });
    expect(records[0].path).toBe(`/api/osquery/live_queries/${ACTION_ID}`);
  });

  test('does not add a prefix when spaceId is omitted', async () => {
    const { kbnClient, records } = makeKbnClient([ok([{ status: 'completed' }])]);
    await waitForLiveQueryComplete(kbnClient, ACTION_ID, { timeoutMs: 500, pollIntervalMs: 10 });
    expect(records[0].path).toBe(`/api/osquery/live_queries/${ACTION_ID}`);
  });

  test('raises a descriptive error when the action never completes', async () => {
    const { kbnClient } = makeKbnClient(
      Array.from({ length: 100 }, () => ok([{ status: 'pending' }]))
    );
    await expect(
      waitForLiveQueryComplete(kbnClient, ACTION_ID, { timeoutMs: 100, pollIntervalMs: 10 })
    ).rejects.toThrow(/timed out/);
  });
});
