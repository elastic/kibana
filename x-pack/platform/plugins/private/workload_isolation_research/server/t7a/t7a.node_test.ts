/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). Native tests for the alerting class pool codecs and seams.
 * Run: node x-pack/platform/plugins/private/workload_isolation_research/server/t7a/t7a_probe.cts */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';
import { isExternalUiamCredential, markExternalUiamCredential } from '@kbn/core-security-server';
import {
  createRetryableError,
  createTaskRunError,
  getErrorSource,
  isRetryableError,
  isUnrecoverableError,
  throwUnrecoverableError,
} from '@kbn/task-manager-plugin/server/task_running';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { createTaskRunnerWithResearchOverride, setResearchRunnerOverride } from '@kbn/task-manager-plugin/server/lib/research_runner_override';
import { encode, decode } from '../capability_kit/codecs';
import type { CodecInput } from '../capability_kit/codecs';
import { decodeFakeRequest, encodeFakeRequest } from './request_codec';
import { decodeRunResult, decodeTaskError, encodeRunResult, encodeTaskError } from './task_codec';
import { missStats, strict, toData } from './isolate/bridge';

const wire = <T>(value: T): T => decode(encode(value as CodecInput)) as T;

test('fake request codec keeps raw authorization, branded space and external UIAM mark', () => {
  const request = kibanaRequestFactory({
    headers: { authorization: 'ApiKey c2VjcmV0', 'x-custom': ['a', 'b'] },
    spaceId: brandSpaceId('space-a'),
  });
  markExternalUiamCredential(request);
  const rebuilt = decodeFakeRequest(wire(encodeFakeRequest(request)));
  assert.equal(ensureRawRequest(rebuilt).headers.authorization, 'ApiKey c2VjcmV0');
  assert.deepEqual(ensureRawRequest(rebuilt).headers['x-custom'], ['a', 'b']);
  assert.equal((rebuilt as typeof rebuilt & { spaceId?: string }).spaceId, 'space-a');
  assert.equal(rebuilt.isFakeRequest, true);
  assert.equal(isExternalUiamCredential(rebuilt), true);
});

test('fake request codec rejects non-fake requests and bad descriptors', () => {
  const fake = kibanaRequestFactory({ headers: {} });
  const real = Object.create(fake, { isFakeRequest: { value: false } });
  assert.throws(() => encodeFakeRequest(real), /only fake requests/);
  assert.throws(() => decodeFakeRequest({ kind: 'nope' } as never), /bad descriptor/);
});

test('TM decorated errors survive the boundary (module-private symbols rebuilt)', () => {
  const retryAt = new Date('2026-10-20T12:00:00.000Z');
  const retryable = decodeTaskError(
    wire(encodeTaskError(createRetryableError(createTaskRunError(new Error('r'), TaskErrorSource.USER), retryAt)))
  );
  assert.equal((isRetryableError(retryable) as Date).toISOString(), retryAt.toISOString());
  assert.equal(getErrorSource(retryable), TaskErrorSource.USER);

  let unrecoverable: Error | undefined;
  try {
    throwUnrecoverableError(new Error('u'));
  } catch (e) {
    unrecoverable = e as Error;
  }
  const restored = decodeTaskError(wire(encodeTaskError(unrecoverable!)));
  assert.equal(isUnrecoverableError(restored), true);
  assert.equal(restored.message, 'u');
  // a plain error stays plain
  const plain = decodeTaskError(wire(encodeTaskError(new Error('p'))));
  assert.equal(isUnrecoverableError(plain), false);
  assert.equal(isRetryableError(plain), null);
});

test('run result codec revives Dates and decorated taskRunError', () => {
  const runAt = new Date('2026-10-20T13:00:00.000Z');
  const result = decodeRunResult(
    wire(
      encodeRunResult({
        state: { a: 1, nested: { at: runAt } },
        runAt,
        taskRunError: createTaskRunError(new Error('rule failed'), TaskErrorSource.USER),
      })
    )
  )!;
  assert.ok(result.runAt instanceof Date);
  assert.equal((result.runAt as Date).toISOString(), runAt.toISOString());
  assert.ok(((result.state as { nested: { at: Date } }).nested.at) instanceof Date);
  assert.equal(getErrorSource(result.taskRunError as Error), TaskErrorSource.USER);
});

test('strict facade names missing members and toData keeps dates, drops functions', () => {
  const facade = strict<{ a: number; b: number }>('fixture', { a: 1 });
  assert.equal(facade.a, 1);
  assert.throws(() => facade.b, /T7A_UNSUPPORTED fixture\.b/);
  assert.equal(missStats.get('fixture.b'), 1);
  const at = new Date(0);
  assert.deepEqual(toData({ at, fn: () => 1, nested: [1, undefined, { x: 'y' }] }), {
    at,
    nested: [1, null, { x: 'y' }],
  });
});

test('TM research runner override takes precedence only while installed', () => {
  const original = () => ({ run: async () => ({ state: { from: 'original' } }) });
  const context = { taskInstance: {} } as never;
  assert.equal(createTaskRunnerWithResearchOverride('x', original as never, context).run.name, 'run');
  setResearchRunnerOverride((type) =>
    type === 'x' ? ({ run: async () => ({ state: { from: 'override' } }) } as never) : undefined
  );
  try {
    return Promise.all([
      createTaskRunnerWithResearchOverride('x', original as never, context).run(),
      createTaskRunnerWithResearchOverride('y', original as never, context).run(),
    ]).then(([x, y]) => {
      assert.deepEqual((x as { state: object }).state, { from: 'override' });
      assert.deepEqual((y as { state: object }).state, { from: 'original' });
    });
  } finally {
    setResearchRunnerOverride(undefined);
  }
});
