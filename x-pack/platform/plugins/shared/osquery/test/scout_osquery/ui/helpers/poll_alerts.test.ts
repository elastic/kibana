/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { waitForAtLeastOneAlert } from './poll_alerts';

const RULE_ID = 'rule-uuid-123';

type RequestFn = KbnClient['request'];
type MockResponse = unknown;

function makeKbnClient(responses: Array<MockResponse | Error>): {
  kbnClient: KbnClient;
  calls: number;
} {
  let calls = 0;
  const request: RequestFn = (async () => {
    const next = responses[calls];
    calls += 1;
    if (next instanceof Error) throw next;
    if (next === undefined) {
      return { data: { hits: { total: { value: 0 } } }, status: 200 } as never;
    }

    return next as never;
  }) as RequestFn;
  const kbnClient = { request } as unknown as KbnClient;

  return {
    kbnClient,
    get calls() {
      return calls;
    },
  };
}

const ok = (total: number): MockResponse => ({
  data: { hits: { total: { value: total } } },
  status: 200,
});

class HttpError extends Error {
  constructor(public response: { status: number }) {
    super(`HTTP ${response.status}`);
  }
}

describe('waitForAtLeastOneAlert', () => {
  test('returns as soon as hits.total.value >= 1', async () => {
    const { kbnClient } = makeKbnClient([ok(3)]);
    await expect(
      waitForAtLeastOneAlert(kbnClient, RULE_ID, { timeoutMs: 1_000, pollIntervalMs: 50 })
    ).resolves.toBeUndefined();
  });

  test('handles the response when hits.total is a plain number', async () => {
    const { kbnClient } = makeKbnClient([{ data: { hits: { total: 2 } }, status: 200 }]);
    await expect(
      waitForAtLeastOneAlert(kbnClient, RULE_ID, { timeoutMs: 1_000, pollIntervalMs: 50 })
    ).resolves.toBeUndefined();
  });

  test('keeps polling after a 404 index_not_found until a hit appears', async () => {
    const { kbnClient } = makeKbnClient([new HttpError({ status: 404 }), ok(1)]);
    await expect(
      waitForAtLeastOneAlert(kbnClient, RULE_ID, { timeoutMs: 1_000, pollIntervalMs: 20 })
    ).resolves.toBeUndefined();
  });

  test('keeps polling while hits.total.value stays zero until it becomes non-zero', async () => {
    const { kbnClient } = makeKbnClient([ok(0), ok(0), ok(1)]);
    await expect(
      waitForAtLeastOneAlert(kbnClient, RULE_ID, { timeoutMs: 1_000, pollIntervalMs: 10 })
    ).resolves.toBeUndefined();
  });

  test('throws immediately on 401', async () => {
    const { kbnClient } = makeKbnClient([new HttpError({ status: 401 })]);
    await expect(
      waitForAtLeastOneAlert(kbnClient, RULE_ID, { timeoutMs: 1_000, pollIntervalMs: 10 })
    ).rejects.toThrow(/role lacks/);
  });

  test('throws immediately on 403', async () => {
    const { kbnClient } = makeKbnClient([new HttpError({ status: 403 })]);
    await expect(
      waitForAtLeastOneAlert(kbnClient, RULE_ID, { timeoutMs: 1_000, pollIntervalMs: 10 })
    ).rejects.toThrow(/role lacks/);
  });

  test('gives up after MAX_5XX_RETRIES consecutive 5xx responses', async () => {
    const { kbnClient } = makeKbnClient([
      new HttpError({ status: 503 }),
      new HttpError({ status: 503 }),
      new HttpError({ status: 503 }),
      new HttpError({ status: 503 }),
    ]);
    await expect(
      waitForAtLeastOneAlert(kbnClient, RULE_ID, { timeoutMs: 5_000, pollIntervalMs: 10 })
    ).rejects.toThrow(/consecutive 5xx/);
  });

  test('raises a descriptive error when no alert appears within the deadline', async () => {
    const { kbnClient } = makeKbnClient(Array.from({ length: 50 }, () => ok(0)));
    await expect(
      waitForAtLeastOneAlert(kbnClient, RULE_ID, { timeoutMs: 100, pollIntervalMs: 10 })
    ).rejects.toThrow(/timed out/);
  });
});
