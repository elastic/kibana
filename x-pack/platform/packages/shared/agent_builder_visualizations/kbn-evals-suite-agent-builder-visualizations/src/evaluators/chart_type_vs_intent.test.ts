/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedVisualization } from '../extract_visualization';
import {
  createChartTypeVsIntentEvaluator,
  describeActualChartForm,
  type ChartIntentJudge,
} from './chart_type_vs_intent';
import type { GoldChartForm } from './gold_visualization_config';

const satisfies: ChartIntentJudge = async () => ({ verdict: 'satisfies', reason: 'Same family.' });
const doesNotSatisfy: ChartIntentJudge = async () => ({
  verdict: 'does_not_satisfy',
  reason: 'Pie instead of bar.',
});

const evaluate = async ({
  visualizations,
  gold,
  judge = satisfies,
  question = 'Create a bar chart of requests by response code.',
}: {
  visualizations: ExtractedVisualization[];
  gold?: GoldChartForm;
  judge?: ChartIntentJudge;
  question?: string;
}) => {
  const evaluator = createChartTypeVsIntentEvaluator({
    visualizationExtractor: () => visualizations,
    questionExtractor: (input) => (input as { question: string }).question,
    expectedChartFormExtractor: () => gold,
    judge,
  });

  return evaluator.evaluate({
    input: { question },
    output: { errors: [], messages: [] },
    expected: {},
    metadata: {},
  });
};

describe('describeActualChartForm', () => {
  it('reads chart type, xy layer types, and renderer from a Lens visualization', () => {
    expect(
      describeActualChartForm({
        esql: 'FROM a',
        chartType: 'xy',
        renderer: 'lens',
        visualization: { type: 'xy', layers: [{ type: 'bar' }, { type: 'line' }] },
      })
    ).toEqual({ chartType: 'xy', renderer: 'lens', layerTypes: ['bar', 'line'], mark: undefined });
  });

  it('reads a string or object mark from a Vega spec', () => {
    expect(
      describeActualChartForm({
        esql: 'FROM a',
        renderer: 'vega',
        visualization: { spec: JSON.stringify({ mark: { type: 'circle' } }) },
      }).mark
    ).toBe('circle');
    expect(
      describeActualChartForm({
        esql: 'FROM a',
        renderer: 'vega',
        visualization: { spec: JSON.stringify({ mark: 'point' }) },
      }).mark
    ).toBe('point');
  });
});

describe('createChartTypeVsIntentEvaluator', () => {
  it('skips when the example declares no chart form', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM a', chartType: 'xy' }],
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('scores 0 without calling the judge when no visualization was produced', async () => {
    const judge = jest.fn(satisfies);
    const result = await evaluate({ visualizations: [], gold: { chartType: 'xy' }, judge });

    expect(result.score).toBe(0);
    expect(result.label).toBe('no-visualization');
    expect(judge).not.toHaveBeenCalled();
  });

  it('hands the judge the question, gold form, and produced form', async () => {
    const judge = jest.fn(satisfies);
    const gold: GoldChartForm = { chartType: 'xy', layerTypes: [['bar', 'bar_horizontal']] };

    const result = await evaluate({
      gold,
      judge,
      question: 'Create a bar chart.',
      visualizations: [
        {
          esql: 'FROM a',
          chartType: 'xy',
          renderer: 'lens',
          visualization: { type: 'xy', layers: [{ type: 'bar_stacked' }] },
        },
      ],
    });

    expect(judge).toHaveBeenCalledWith({
      question: 'Create a bar chart.',
      gold,
      actual: { chartType: 'xy', renderer: 'lens', layerTypes: ['bar_stacked'], mark: undefined },
    });
    expect(result.score).toBe(1);
    expect(result.label).toBe('match');
  });

  it('scores 0 and surfaces the reason when the judge rejects the chart form', async () => {
    const result = await evaluate({
      gold: { chartType: 'xy' },
      judge: doesNotSatisfy,
      visualizations: [{ esql: 'FROM a', chartType: 'pie' }],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('mismatch');
    expect(result.explanation).toBe('Pie instead of bar.');
  });

  it('averages verdicts across visualizations', async () => {
    let call = 0;
    const alternating: ChartIntentJudge = async () =>
      call++ === 0 ? satisfies({} as never) : doesNotSatisfy({} as never);

    const result = await evaluate({
      gold: { chartType: 'xy' },
      judge: alternating,
      visualizations: [
        { esql: 'FROM a', chartType: 'xy' },
        { esql: 'FROM a', chartType: 'pie' },
      ],
    });

    expect(result.score).toBe(0.5);
    expect(result.label).toBe('partial');
  });

  it('abstains with a null score when the judge throws', async () => {
    const failing: ChartIntentJudge = async () => {
      throw new Error('no tool call');
    };

    const result = await evaluate({
      gold: { chartType: 'xy' },
      judge: failing,
      visualizations: [{ esql: 'FROM a', chartType: 'xy' }],
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('judge-failure');
    expect(result.explanation).toContain('no tool call');
    expect(result.metadata).toEqual(
      expect.objectContaining({
        visualizations: [
          expect.objectContaining({ fallback: 'judge_no_tool_call', reason: 'no tool call' }),
        ],
      })
    );
  });
});
