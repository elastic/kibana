/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  admitsClassAction,
  ALERTING_ES_QUERY_INDEX_CLASS,
  decideOptional,
  loadClassIndexConnector,
  OPTIONAL_PRODUCER_IDS,
  pluginsFor,
  readBootArm,
  REQUIRED_PLUGINS,
} from './boot_policy';

void test('baseline boots stackConnectors and class skips it by exact id', () => {
  for (const id of OPTIONAL_PRODUCER_IDS) {
    assert.equal(decideOptional('baseline', id), 'boot');
    assert.equal(decideOptional('class', id), 'skip');
  }
  assert.equal(decideOptional('class', 'stackConnector'), 'skip');
  assert.equal(decideOptional('class', 'stackConnectorsExtra'), 'skip');
  assert.equal(decideOptional('baseline', 'stackConnector'), 'skip');
  assert.equal(decideOptional('class', 'eventLog'), 'skip');
  assert.equal(decideOptional('baseline', 'actions'), 'skip');
});

void test('the class plugin list is the required set and does not grow by prefix', () => {
  assert.deepEqual(pluginsFor('class', false), [...REQUIRED_PLUGINS]);
  assert.deepEqual(pluginsFor('baseline', false), [...REQUIRED_PLUGINS, 'stackConnectors']);
  assert.deepEqual(pluginsFor('class', true), ['encryptedSavedObjects', ...REQUIRED_PLUGINS]);
  assert.equal(pluginsFor('class', true).includes('stackConnectors'), false);
  assert.equal(pluginsFor('class', true).includes('encryptedSavedObjects2'), false);
  assert.equal(readBootArm(undefined), 'baseline');
  assert.equal(readBootArm('classy'), 'baseline');
  assert.equal(readBootArm('class'), 'class');
});

void test('only the declared index connector is in the class, and the module id matches', async () => {
  assert.equal(admitsClassAction('.index'), true);
  assert.equal(admitsClassAction('.index2'), false);
  assert.equal(admitsClassAction('.email'), false);
  assert.equal(admitsClassAction('index'), false);
  assert.deepEqual(ALERTING_ES_QUERY_INDEX_CLASS.actionTypes, ['.index']);
  assert.deepEqual(ALERTING_ES_QUERY_INDEX_CLASS.ruleTypes, ['.es-query', '.index-threshold']);
  assert.equal((await loadClassIndexConnector()).id, '.index');
});
