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
import {
  HTTPAuthorizationHeader,
  isExternalUiamCredential,
  markExternalUiamCredential,
} from '@kbn/core-security-server';
import {
  createRetryableError,
  createTaskRunError,
  getErrorSource,
  isRetryableError,
  isUnrecoverableError,
  throwUnrecoverableError,
} from '@kbn/task-manager-plugin/server/task_running';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import {
  createTaskRunnerWithResearchOverride,
  setResearchRunnerOverride,
} from '@kbn/task-manager-plugin/server/lib/research_runner_override';
import { encode, decode } from '../capability_kit/codecs';
import type { CodecInput } from '../capability_kit/codecs';
import { decodeFakeRequest, encodeFakeRequest, reviveTaskManagerArgs } from './request_codec';
import { decodeRunResult, decodeTaskError, encodeRunResult, encodeTaskError } from './task_codec';
import { missStats, strict, toData } from './isolate/bridge';

const wire = <T>(value: T): T => decode(encode(value as CodecInput)) as T;

void test('fake request codec keeps raw authorization, branded space and external UIAM mark', () => {
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

void test('fake request codec rejects non-fake requests and bad descriptors', () => {
  const fake = kibanaRequestFactory({ headers: {} });
  const real = Object.create(fake, { isFakeRequest: { value: false } });
  assert.throws(() => encodeFakeRequest(real), /only fake requests/);
  assert.throws(() => decodeFakeRequest({ kind: 'nope' } as never), /bad descriptor/);
});

void test('TM decorated errors survive the boundary (module-private symbols rebuilt)', () => {
  const retryAt = new Date('2026-10-20T12:00:00.000Z');
  const retryable = decodeTaskError(
    wire(
      encodeTaskError(
        createRetryableError(createTaskRunError(new Error('r'), TaskErrorSource.USER), retryAt)
      )
    )
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

void test('run result codec revives Dates and decorated taskRunError', () => {
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
  assert.ok((result.state as { nested: { at: Date } }).nested.at instanceof Date);
  assert.equal(getErrorSource(result.taskRunError as Error), TaskErrorSource.USER);
});

void test('strict facade names missing members and toData keeps dates, drops functions', () => {
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

void test('TM research runner override takes precedence only while installed', () => {
  const original = () => ({ run: async () => ({ state: { from: 'original' } }) });
  const context = { taskInstance: {} } as never;
  assert.equal(
    createTaskRunnerWithResearchOverride('x', original as never, context).run.name,
    'run'
  );
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

void test('outbound schedule keeps fake-request authorization that JSON.stringify drops', () => {
  const request = kibanaRequestFactory({ headers: { authorization: 'ApiKey abc' } });
  const dropped = JSON.parse(JSON.stringify(request)) as { headers?: Record<string, string> };
  assert.equal(dropped.headers, undefined);
  assert.throws(() => HTTPAuthorizationHeader.parseFromRequest(dropped as never), /authorization/);
  const scheduled = toData([{ taskType: 'workflow:run' }, { request, cloneApiKey: true }]) as [
    { taskType: string },
    { request: { kind: string; headers: { authorization: string } }; cloneApiKey: boolean }
  ];
  assert.equal(scheduled[1].request.kind, 't7a-fake-request');
  assert.equal(scheduled[1].request.headers.authorization, 'ApiKey abc');
  assert.equal(scheduled[1].cloneApiKey, true);
  const revived = reviveTaskManagerArgs('schedule', scheduled) as [
    { taskType: string },
    { request: Parameters<typeof HTTPAuthorizationHeader.parseFromRequest>[0] }
  ];
  assert.equal(HTTPAuthorizationHeader.parseFromRequest(revived[1].request)?.toString(), 'ApiKey abc');
});

void test('fake-request markers inside task params and state are not revived', () => {
  const request = kibanaRequestFactory({ headers: { authorization: 'ApiKey abc' } });
  const marker = {
    kind: 't7a-fake-request',
    headers: { authorization: 'ApiKey stolen' },
    externalUiam: false,
    customerValue: 'keep-me',
  };
  const args = toData([
    {
      id: 'wake',
      taskType: 'workflow:resume',
      params: marker,
      state: { n: 1, nested: marker },
    },
    { request, cloneApiKey: true },
  ]) as [
    { params: typeof marker; state: { n: number; nested: typeof marker } },
    { request: { kind: string } }
  ];
  const revived = reviveTaskManagerArgs('ensureScheduled', args) as [
    { params: typeof marker; state: { n: number; nested: typeof marker } },
    { request: Parameters<typeof HTTPAuthorizationHeader.parseFromRequest>[0]; cloneApiKey: boolean }
  ];
  assert.equal(revived[0].params.customerValue, 'keep-me');
  assert.equal(revived[0].params.kind, 't7a-fake-request');
  assert.equal(revived[0].state.n, 1);
  assert.equal(revived[0].state.nested.customerValue, 'keep-me');
  assert.equal(revived[0].state.nested.kind, 't7a-fake-request');
  assert.equal(revived[1].cloneApiKey, true);
  assert.equal(HTTPAuthorizationHeader.parseFromRequest(revived[1].request)?.toString(), 'ApiKey abc');
});

void test('a string externalUiam is rejected only when it is the task-manager request', () => {
  const bad = {
    kind: 't7a-fake-request' as const,
    headers: { authorization: 'ApiKey abc' },
    externalUiam: 'false' as unknown as boolean,
  };
  const kept = reviveTaskManagerArgs('schedule', [
    { taskType: 'workflow:resume', params: bad, state: { kept: true } },
  ]) as [{ params: { externalUiam: string }; state: { kept: boolean } }];
  assert.equal(kept[0].params.externalUiam, 'false');
  assert.equal(kept[0].state.kept, true);
  assert.throws(
    () => reviveTaskManagerArgs('schedule', [{ taskType: 'workflow:resume' }, { request: bad }]),
    /externalUiam must be boolean/
  );
  assert.throws(
    () =>
      reviveTaskManagerArgs('bulkUpdateSchedules', [
        ['id'],
        { interval: '1m' },
        { request: { kind: 't7a-fake-request', headers: [], externalUiam: false } },
      ]),
    /headers must be an object/
  );
});
