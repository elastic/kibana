/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { control, dashboard } from '../test_helpers';
import { createControlQueriesEvaluator } from './control_queries';

const createEsClient = (run: (query: string) => Promise<{ values: unknown[][] }>): EsClient =>
  ({ esql: { query: ({ query }: { query: string }) => run(query) } } as unknown as EsClient);

const evaluateWith = (esClient: EsClient, controls: Array<Record<string, unknown>> | undefined) =>
  createControlQueriesEvaluator(esClient).evaluate({
    input: { question: 'q' },
    expected: { route: 'dashboard' },
    metadata: undefined,
    output: {
      errors: [],
      messages: [],
      dashboard: controls ? dashboard([], { pinned_panels: controls }) : undefined,
    },
  });

describe('dashboard control queries evaluator', () => {
  it('scores 0 without a dashboard and skips without controls', async () => {
    const esClient = createEsClient(async () => ({ values: [] }));
    expect((await evaluateWith(esClient, undefined)).score).toBe(0);
    const skipped = await evaluateWith(esClient, []);
    expect(skipped.score).toBeNull();
    expect(skipped.explanation).toContain('no controls');
  });

  it('runs each control query once and scores the fraction that execute', async () => {
    const queries: string[] = [];
    const esClient = createEsClient(async (query) => {
      queries.push(query);
      if (query.includes('status_code')) {
        throw new Error('verification_exception: Unknown column [status_code]\n\tRoot causes: ...');
      }
      return { values: [['200'], ['404']] };
    });
    const result = await evaluateWith(esClient, [
      control('response.keyword'),
      control('status_code'),
      { type: 'time_slider_control', id: 't', config: {} },
    ]);
    expect(queries).toHaveLength(2);
    expect(result.score).toBe(0.5);
    expect(result.label).toBe('broken-controls');
    expect(result.explanation).toContain(
      'status_code: verification_exception: Unknown column [status_code]'
    );
    expect(result.explanation).not.toContain('Root causes');
  });

  it('reports the value counts when every query executes', async () => {
    const esClient = createEsClient(async () => ({ values: [['a'], ['b'], ['c']] }));
    const result = await evaluateWith(esClient, [control('machine.os.keyword')]);
    expect(result.score).toBe(1);
    expect(result.explanation).toContain('machine.os.keyword (3 values)');
  });
});
