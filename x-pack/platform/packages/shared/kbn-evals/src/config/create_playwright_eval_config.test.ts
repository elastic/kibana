/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StackConnectorDefinition } from '../utils/eval_connector';

jest.mock('@kbn/scout', () => ({
  createPlaywrightConfig: () => ({
    reporter: [],
    use: { serversConfigDir: '/servers' },
    projects: [{ name: 'local', use: {} }],
  }),
}));

const mockConnectors: StackConnectorDefinition[] = [
  { id: 'judge', name: 'Judge', actionTypeId: '.gen-ai', config: {}, type: 'stack_connector' },
  { id: 'model', name: 'Model', actionTypeId: '.gen-ai', config: {}, type: 'stack_connector' },
];

jest.mock('../utils/inference_endpoint_definition', () => ({
  loadInferenceEndpoints: () => [],
}));
jest.mock('../utils/eval_connector', () => ({
  loadStackConnectors: () => mockConnectors,
}));

import { createPlaywrightEvalsConfig } from './create_playwright_eval_config';

describe('createPlaywrightEvalsConfig concurrency', () => {
  const previousEnv = { ...process.env };

  beforeEach(() => {
    process.env.EVAL_CONNECTOR_ID = 'judge';
    delete process.env.EVAL_CONCURRENCY;
  });

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  const projectConcurrency = (options: { concurrency?: number } = {}): unknown[] =>
    (createPlaywrightEvalsConfig({ testDir: '/evals', ...options }).projects ?? []).map(
      ({ use }) => (use as { concurrency?: number } | undefined)?.concurrency
    );

  it('defaults every connector project to 5', () => {
    expect(projectConcurrency()).toEqual([5, 5]);
  });

  it("uses the suite's configured concurrency", () => {
    expect(projectConcurrency({ concurrency: 16 })).toEqual([16, 16]);
  });

  it('lets EVAL_CONCURRENCY override the suite default', () => {
    process.env.EVAL_CONCURRENCY = '8';
    expect(projectConcurrency({ concurrency: 16 })).toEqual([8, 8]);
  });

  it('treats an empty EVAL_CONCURRENCY as unset, as CI forwards it', () => {
    process.env.EVAL_CONCURRENCY = '';
    expect(projectConcurrency({ concurrency: 16 })).toEqual([16, 16]);
  });

  it('rejects an invalid EVAL_CONCURRENCY', () => {
    process.env.EVAL_CONCURRENCY = '0';
    expect(() => projectConcurrency()).toThrow(
      'EVAL_CONCURRENCY must be a positive integer, got "0".'
    );
  });
});
