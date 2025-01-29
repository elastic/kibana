/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SamplesFormatName } from '../../common';

export const kvState = {
  lastExecutedChain: 'testchain',
  packageName: 'testPackage',
  dataStreamName: 'testDatastream',
  kvProcessor: { kv: { field: 'test', target_field: 'newtest' } },
  logSamples: ['<134>1 dummy="data"'],
  jsonSamples: ['{"test1": "test1"}'],
  kvLogMessages: ['{"test1": "test1"}'],
  finalized: false,
  samplesFormat: { name: SamplesFormatName.Values.structured },
  header: true,
  ecsVersion: 'testVersion',
  errors: { test: 'testerror' },
  additionalProcessors: [{ kv: { field: 'test', target_field: 'newtest' } }],
  grokPattern: 'testPattern',
};
