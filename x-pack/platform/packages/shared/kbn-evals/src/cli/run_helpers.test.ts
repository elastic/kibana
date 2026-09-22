/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { readInvestigationRunEnv, buildEvalRunArgs } from './run_helpers';

describe('investigation CLI options', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of [
      'NIGHTSHIFT_DATASETS',
      'NIGHTSHIFT_CONCURRENCY',
      'NIGHTSHIFT_DATASET_ID',
      'NIGHTSHIFT_EXAMPLES_FILE',
    ]) {
      delete process.env[name];
    }
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it('selects trace-only investigations and retains dataset and concurrency in the rerun command', () => {
    const flagsReader = new FlagsReader({ 'dataset-id': 'stored-dataset', concurrency: '16' });
    expect(readInvestigationRunEnv(flagsReader, 'nightshift-investigations')).toEqual({
      NIGHTSHIFT_DATASETS: 'trace-only',
      NIGHTSHIFT_DATASET_ID: 'stored-dataset',
      NIGHTSHIFT_CONCURRENCY: '16',
    });
    expect(
      buildEvalRunArgs({
        suiteId: 'nightshift-investigations',
        evaluationConnectorId: 'test-model',
        projects: ['test-model'],
        flagsReader,
      })
    ).toEqual([
      '--suite',
      'nightshift-investigations',
      '--judge',
      'test-model',
      '--model',
      'test-model',
      '--dataset-id',
      'stored-dataset',
      '--concurrency',
      '16',
    ]);
  });

  it('keeps the default smoke run unchanged', () => {
    expect(readInvestigationRunEnv(new FlagsReader({}), 'nightshift-investigations')).toEqual({});
  });

  it.each(['0', '21', '1.5', 'invalid'])(
    'rejects unsupported concurrency %s before starting services',
    (value) => {
      expect(() =>
        readInvestigationRunEnv(
          new FlagsReader({ concurrency: value }),
          'nightshift-investigations'
        )
      ).toThrow('integer between 1 and 20');
    }
  );

  it('rejects flags that another suite would ignore', () => {
    expect(() =>
      readInvestigationRunEnv(new FlagsReader({ 'dataset-id': 'stored-dataset' }), 'agent-builder')
    ).toThrow('require --suite nightshift-investigations');
  });

  it('rejects ambiguous dataset sources', () => {
    process.env.NIGHTSHIFT_EXAMPLES_FILE = '/private/examples.json';
    expect(() =>
      readInvestigationRunEnv(
        new FlagsReader({ 'dataset-id': 'stored-dataset' }),
        'nightshift-investigations'
      )
    ).toThrow('Choose either');
  });
});
