/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { createGeneratedQueriesOnlyEvaluator, getTurnQueries } from './esql_tool_call_queries';

const GENERATED = 'PROMQL index=metrics start=?_tstart end=?_tend load=(node_load5)';
const SELF_WRITTEN = 'PROMQL index=metrics start=?_tstart end=?_tend rx=(rate(rx_total[5m]))';

const generateEsqlStep = (esql: string) => ({
  type: 'tool_call',
  tool_id: platformCoreTools.generateEsql,
  params: { query: 'load average' },
  results: [
    { type: 'query', data: { esql } },
    { type: 'other', data: {} },
  ],
});

const executeEsqlStep = (query: string) => ({
  type: 'tool_call',
  tool_id: platformCoreTools.executeEsql,
  params: { query },
  results: [],
});

const visualizationStep = ({ provided, result }: { provided?: string; result: string }) => ({
  type: 'tool_call',
  tool_id: platformCoreTools.createVisualization,
  params: { query: 'chart', target: { type: 'lens', ...(provided ? { esql: provided } : {}) } },
  results: [{ type: 'visualization', data: { esql: result } }],
});

describe('getTurnQueries', () => {
  it('separates generated queries from the ones passed to execute_esql', () => {
    expect(
      getTurnQueries([
        { type: 'reasoning' },
        generateEsqlStep(GENERATED),
        executeEsqlStep(SELF_WRITTEN),
      ])
    ).toEqual({ generated: [GENERATED], provided: [SELF_WRITTEN], answer: SELF_WRITTEN });
  });

  it('treats a visualization query as generated when the agent passed none', () => {
    expect(getTurnQueries([visualizationStep({ result: GENERATED })])).toEqual({
      generated: [GENERATED],
      provided: [],
      answer: GENERATED,
    });
  });

  it('treats a visualization esql passed by the agent as provided', () => {
    expect(
      getTurnQueries([visualizationStep({ provided: SELF_WRITTEN, result: SELF_WRITTEN })])
    ).toEqual({ generated: [], provided: [SELF_WRITTEN], answer: SELF_WRITTEN });
  });

  it('ignores exploratory queries that read raw documents', () => {
    expect(
      getTurnQueries([
        generateEsqlStep(GENERATED),
        executeEsqlStep(GENERATED),
        executeEsqlStep('FROM metrics | LIMIT 1'),
      ])
    ).toEqual({ generated: [GENERATED], provided: [GENERATED], answer: GENERATED });
  });

  it('falls back to the last generated query when no query was used', () => {
    expect(getTurnQueries([generateEsqlStep(GENERATED)]).answer).toBe(GENERATED);
  });
});

describe('createGeneratedQueriesOnlyEvaluator', () => {
  interface Output {
    generated: string[];
    provided: string[];
    answer?: string;
  }
  const evaluator = createGeneratedQueriesOnlyEvaluator({
    getQueries: (output: Output) => output,
  });
  const evaluate = (output: Output) =>
    evaluator.evaluate({ input: {}, output, expected: {}, metadata: {} });

  it('passes queries that were generated, ignoring whitespace', async () => {
    const result = await evaluate({
      generated: [GENERATED],
      provided: [GENERATED.replace(/ /g, '\n  ')],
    });
    expect(result).toMatchObject({ score: 1, label: 'generated' });
  });

  it('scores the share of self-written queries', async () => {
    const result = await evaluate({ generated: [GENERATED], provided: [GENERATED, SELF_WRITTEN] });
    expect(result).toMatchObject({ score: 0.5, label: 'self-written' });
    expect(result.explanation).toContain(SELF_WRITTEN);
  });

  it('passes generated time range options that were dropped', async () => {
    const result = await evaluate({
      generated: [GENERATED],
      provided: ['PROMQL index=metrics load=(node_load5)'],
    });
    expect(result).toMatchObject({ score: 1, label: 'generated' });
  });

  it('passes when the answer used a generated query without providing one', async () => {
    expect(
      await evaluate({ generated: [GENERATED], provided: [], answer: GENERATED })
    ).toMatchObject({ score: 1, label: 'none-provided' });
  });

  it('fails when the turn used no query', async () => {
    expect(await evaluate({ generated: [GENERATED], provided: [] })).toMatchObject({
      score: 0,
      label: 'no-query',
    });
  });
});
