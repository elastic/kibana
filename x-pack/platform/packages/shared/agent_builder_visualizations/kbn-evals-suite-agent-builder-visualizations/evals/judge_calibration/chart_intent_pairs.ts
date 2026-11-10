/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActualChartForm,
  ChartIntentVerdict,
} from '../../src/evaluators/chart_type_vs_intent';
import type { GoldChartForm } from '../../src/evaluators/gold_visualization_config';

export interface ChartIntentCalibrationPair {
  question: string;
  gold: GoldChartForm;
  actual: ActualChartForm;
  verdict: ChartIntentVerdict['verdict'];
  /** Why a human would rule this way; shown next to disagreements. */
  rationale: string;
}

const lens = (chartType: string, ...layerTypes: string[]): ActualChartForm => ({
  chartType,
  renderer: 'lens',
  layerTypes,
});

const vega = (mark: string): ActualChartForm => ({ renderer: 'vega', layerTypes: [], mark });

/**
 * Fixed gold / produced pairs with a human verdict. Run against the real judge
 * to measure agreement; a drop after a rubric or model change is a judge
 * regression, not an agent regression.
 */
export const CHART_INTENT_CALIBRATION_PAIRS: ChartIntentCalibrationPair[] = [
  {
    question: 'Create a bar chart of request counts by response code.',
    gold: { chartType: 'xy', layerTypes: [['bar', 'bar_horizontal']] },
    actual: lens('xy', 'bar_stacked'),
    verdict: 'satisfies',
    rationale: 'A stacked bar is still a bar chart when the request did not say otherwise.',
  },
  {
    question: 'Create a bar chart of request counts by response code.',
    gold: { chartType: 'xy', layerTypes: [['bar', 'bar_horizontal']] },
    actual: lens('xy', 'line'),
    verdict: 'does_not_satisfy',
    rationale: 'The user asked for bars and got a line.',
  },
  {
    question: 'Create a horizontal bar chart of the top operating systems by request count.',
    gold: { chartType: 'xy', layerTypes: ['bar_horizontal'] },
    actual: lens('xy', 'bar'),
    verdict: 'does_not_satisfy',
    rationale: 'Horizontal was explicit; vertical bars contradict it.',
  },
  {
    question: 'Create a line chart of total bytes over time.',
    gold: { chartType: 'xy', layerTypes: ['line'] },
    actual: lens('xy', 'area'),
    verdict: 'does_not_satisfy',
    rationale: 'Line was explicit; an area chart is a different mark.',
  },
  {
    question: 'Show total bytes over time.',
    gold: { chartType: 'xy', layerTypes: ['line'] },
    actual: lens('xy', 'area'),
    verdict: 'satisfies',
    rationale: 'No mark was requested; area is a reasonable time-series form.',
  },
  {
    question: 'Create a pie chart of request counts by response code.',
    gold: { chartType: 'pie' },
    actual: lens('xy', 'bar'),
    verdict: 'does_not_satisfy',
    rationale: 'A different kind of chart.',
  },
  {
    question: 'Show average bytes per request as a gauge.',
    gold: { chartType: 'gauge' },
    actual: lens('metric'),
    verdict: 'does_not_satisfy',
    rationale: 'Gauge was explicit; a metric tile is not a gauge.',
  },
  {
    question: 'Create a single metric visualization showing the total number of requests.',
    gold: { chartType: 'metric' },
    actual: lens('METRIC'),
    verdict: 'satisfies',
    rationale: 'Casing never matters.',
  },
  {
    question: 'Create a Vega-Lite scatter plot of average bytes vs request count by client IP.',
    gold: { mark: 'point' },
    actual: vega('circle'),
    verdict: 'satisfies',
    rationale: 'Point and circle are interchangeable scatter marks.',
  },
  {
    question: 'Create a Vega-Lite scatter plot of average bytes vs request count by client IP.',
    gold: { mark: 'point' },
    actual: vega('bar'),
    verdict: 'does_not_satisfy',
    rationale: 'Bars are not a scatter.',
  },
  {
    question: 'Create a treemap of request counts by host.',
    gold: { chartType: 'treemap' },
    actual: lens('pie'),
    verdict: 'does_not_satisfy',
    rationale: 'Treemap was explicit; a pie is a different partition chart.',
  },
  {
    question: 'Create a bar chart of request counts by response code.',
    gold: { chartType: 'xy', layerTypes: [['bar', 'bar_horizontal']] },
    actual: { renderer: 'lens', layerTypes: [] },
    verdict: 'does_not_satisfy',
    rationale: 'No chart form was produced at all.',
  },
];
