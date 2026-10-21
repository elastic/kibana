/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acceptHeapPacket } from './worker_heap_state';

void test('a heap packet keeps finite worker numbers and drops non-strings', () => {
  const accepted = acceptHeapPacket({
    heapSizeLimit: 452984832,
    heapUsed: 100,
    heapTotal: 200,
    bootMs: 1800,
    ruleTypeIds: ['.es-query', 3, '.index-threshold'],
    actionTypeIds: ['.index'],
  });
  assert.equal(accepted?.heapSizeLimit, 452984832);
  assert.equal(accepted?.bootMs, 1800);
  assert.deepEqual(accepted?.ruleTypeIds, ['.es-query', '.index-threshold']);
  assert.deepEqual(accepted?.actionTypeIds, ['.index']);
});

void test('a string heap limit and an ISO duration are not a worker sample', () => {
  assert.equal(acceptHeapPacket({ heapSizeLimit: '452984832', heapUsed: 1, heapTotal: 1 }), null);
  const duration = acceptHeapPacket({
    heapSizeLimit: 1,
    heapUsed: 1,
    heapTotal: 1,
    bootMs: 'PT30S',
  });
  assert.equal(duration?.bootMs, null);
  assert.equal(duration?.heapSizeLimit, 1);
  const overflow = acceptHeapPacket({
    heapSizeLimit: 1,
    heapUsed: 1,
    heapTotal: 1,
    actionTypeIds: Array.from({ length: 501 }, (_, index) => `id-${index}`),
  });
  assert.equal(overflow?.actionTypeIds.length, 500);
  assert.equal(overflow?.actionTypeIds[499], 'id-499');
});
