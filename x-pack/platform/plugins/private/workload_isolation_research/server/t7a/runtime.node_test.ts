/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveChildOldSpaceMb } from '../capability_kit/transport';
import type { T7aConfig } from './main_host';
import {
  applyRuntime,
  buildRuntimeDoc,
  bumpSampleRequest,
  parentOldSpaceMb,
  parseRuntimeDoc,
  runsOnBackgroundTasks,
} from './runtime';

test('a runtime doc keeps the allowlist and rejects a bad cap', () => {
  assert.equal(parseRuntimeDoc(null), null);
  assert.equal(
    parseRuntimeDoc({ mode: 'thread', generation: 1, childCapMb: 384, sampleRequest: 0 }),
    null
  );
  const parsed = parseRuntimeDoc({
    mode: 'offmain-process',
    generation: 2,
    childCapMb: 384,
    localSo: false,
    sampleRequest: 4,
    token: 'nope',
  });
  assert.deepEqual(parsed, {
    generation: 2,
    mode: 'offmain-process',
    childCapMb: 384,
    localSo: false,
    sampleRequest: 4,
  });
  assert.throws(() => buildRuntimeDoc(null, { mode: 'main', childCapMb: 32 }), /128 to 2048/);
});

test('generation changes the island and a sample request does not', () => {
  const first = buildRuntimeDoc(null, { mode: 'offmain-process', childCapMb: 384 });
  assert.equal(first.generation, 1);
  assert.equal(first.localSo, true);
  const next = buildRuntimeDoc(first, { mode: 'offmain-process', childCapMb: 512 });
  assert.equal(next.generation, 2);
  assert.equal(next.childCapMb, 512);
  const sample = bumpSampleRequest(next);
  assert.equal(sample.generation, 2);
  assert.equal(sample.sampleRequest, 1);
  assert.equal(sample.childCapMb, 512);
});

test('applying the doc uses process transport and the doc cap, not the image default', async () => {
  const seen: Array<Partial<T7aConfig>> = [];
  const controller = {
    configure: async (next: Partial<T7aConfig>) => {
      seen.push(next);
      return next as T7aConfig;
    },
  };
  await applyRuntime(controller, {
    generation: 1,
    mode: 'offmain-process',
    childCapMb: 512,
    localSo: true,
    sampleRequest: 0,
  });
  await applyRuntime(controller, {
    generation: 2,
    mode: 'main',
    childCapMb: 384,
    localSo: true,
    sampleRequest: 0,
  });
  assert.equal(seen[0].transport, 'process');
  assert.equal(seen[0].processOldSpaceMb, 512);
  assert.equal(seen[0].mode, 'offmain');
  assert.equal(seen[1].mode, 'main');
  assert.equal(seen[1].transport, 'thread');
  assert.equal(seen[1].processOldSpaceMb, undefined);
});

test('an explicit child cap beats the parent env and roles select the background process', () => {
  assert.equal(resolveChildOldSpaceMb(512, '384'), '512');
  assert.equal(resolveChildOldSpaceMb(undefined, '384'), '384');
  assert.equal(resolveChildOldSpaceMb(32, '384'), '384');
  assert.equal(resolveChildOldSpaceMb(undefined, 'nope'), undefined);
  assert.equal(runsOnBackgroundTasks(undefined), true);
  assert.equal(runsOnBackgroundTasks('["ui"]'), false);
  assert.equal(runsOnBackgroundTasks('["background_tasks"]'), true);
  assert.equal(runsOnBackgroundTasks('background_tasks'), true);
  assert.equal(parentOldSpaceMb('--max-old-space-size=1638'), 1638);
  assert.equal(parentOldSpaceMb(undefined), null);
});
