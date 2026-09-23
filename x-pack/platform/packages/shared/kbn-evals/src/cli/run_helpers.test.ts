/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { buildEvalRunArgs } from './run_helpers';

it('retains suite options in the rerun command', () => {
  expect(
    buildEvalRunArgs({
      suiteId: 'example-suite',
      evaluationConnectorId: 'test-model',
      projects: [],
      flagsReader: new FlagsReader({ 'dataset-id': 'stored-dataset', concurrency: '16' }),
    })
  ).toEqual([
    '--suite',
    'example-suite',
    '--judge',
    'test-model',
    '--dataset-id',
    'stored-dataset',
    '--concurrency',
    '16',
  ]);
});
