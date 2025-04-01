/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SamplesFormatName } from '../../common';

export const logFormatDetectionTestState = {
  lastExecutedChain: 'testchain',
  logSamples: ['{"test1": "test1"}'],
  jsonSamples: ['{"test1": "test1"}'],
  exAnswer: 'testanswer',
  packageName: 'testPackage',
  dataStreamName: 'testDatastream',
  packageTitle: 'Test Title',
  dataStreamTitle: 'Test Datastream Title',
  finalized: false,
  samplesFormat: { name: SamplesFormatName.Values.structured },
  header: true,
  ecsVersion: 'testVersion',
  results: { test1: 'test1' },
  additionalProcessors: [{ kv: { field: 'test', target_field: 'newtest' } }],
};
