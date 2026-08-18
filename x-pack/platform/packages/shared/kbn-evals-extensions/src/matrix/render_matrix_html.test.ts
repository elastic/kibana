/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderMatrixHtml } from './render_matrix_html';
import type { Matrix } from './build_matrix';
import type { MatrixConfig } from './load_matrix_config';
import type { MatrixTraceData } from './trace_types';

const mockConfig: MatrixConfig = {
  title: 'Test Matrix',
  branch: 'main',
  lookbackDays: 30,
  defaultScale: 10,
  decimals: 2,
  notRecommendedBelow: 0,
  notRecommendedLabel: 'Not recommended',
  notRecommendedCountsAsZeroInOverall: true,
  excludeEvaluators: [],
  overall: { label: 'Overall', mode: 'weighted' },
  showOverall: true,
  columns: [{ id: 'alert', label: 'Alert Analysis', suites: ['suite-1'], weight: 1 }],
  composites: [],
  models: [{ id: 'test-model', label: 'Test Model', openSource: false }],
};

const mockMatrix: Matrix = {
  columns: [{ id: 'alert', label: 'Alert Analysis' }],
  composites: [],
  displayColumns: [
    { id: 'alert', label: 'Alert Analysis', kind: 'base' },
    { id: '__overall__', label: 'Overall', kind: 'overall' },
  ],
  overallLabel: 'Overall',
  proprietary: [
    {
      modelId: 'test-model',
      modelLabel: 'Test Model',
      openSource: false,
      cells: { alert: { kind: 'score', value: 8.5 } },
      overall: { kind: 'score', value: 8.5 },
    },
  ],
  openSource: [],
};

describe('renderMatrixHtml', () => {
  it('renders a self-contained HTML document', () => {
    const html = renderMatrixHtml(mockMatrix, mockConfig);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<style>');
    expect(html).toContain('Test Matrix');
    expect(html).toContain('Test Model');
    expect(html).toContain('8.5');
  });

  it('renders trace data when provided', () => {
    const traces: MatrixTraceData = {
      'test-model:alert': {
        question: 'What is this alert?',
        toolTrail: ['load_skill', 'security.alerts'],
        answer: '## Analysis\n\nThis is a true positive.',
        steps: [
          { type: 'reasoning', text: 'Loading the alert analysis skill.' },
          { type: 'tool', toolId: 'load_skill', toolParams: '' },
        ],
        stepCount: 2,
        toolCount: 1,
      },
    };

    const html = renderMatrixHtml(mockMatrix, mockConfig, {}, traces);
    expect(html).toContain('💬');
    expect(html).toContain('What is this alert?');
    expect(html).toContain('load_skill');
    expect(html).toContain('security.alerts');
    expect(html).toContain('Analysis');
    expect(html).toContain('true positive');
    expect(html).toContain('🔍 Step trace');
  });

  it('shows trace unavailable when no traces provided', () => {
    const html = renderMatrixHtml(mockMatrix, mockConfig);
    expect(html).toContain('Trace unavailable');
  });

  it('includes provenance when provided', () => {
    const html = renderMatrixHtml(mockMatrix, mockConfig, {
      branch: 'feature-branch',
      lookbackDays: 14,
      commitSha: 'abc123',
    });
    expect(html).toContain('feature-branch');
    expect(html).toContain('14-day lookback');
    expect(html).toContain('abc123');
  });

  it('resolves traces via suite ID fallback when column ID does not match', () => {
    // Column ID is 'triage' but traces are keyed by suite ID 'security-alert-triage'
    const configWithSuite: MatrixConfig = {
      ...mockConfig,
      columns: [
        { id: 'triage', label: 'Alert Triage', suites: ['security-alert-triage'], weight: 1 },
      ],
    };
    const matrixWithSuite: Matrix = {
      ...mockMatrix,
      columns: [{ id: 'triage', label: 'Alert Triage' }],
      displayColumns: [
        { id: 'triage', label: 'Alert Triage', kind: 'base' },
        { id: '__overall__', label: 'Overall', kind: 'overall' },
      ],
      proprietary: [
        {
          modelId: 'test-model',
          modelLabel: 'Test Model',
          openSource: false,
          cells: { triage: { kind: 'score', value: 7.2 } },
          overall: { kind: 'score', value: 7.2 },
        },
      ],
    };
    const traces: MatrixTraceData = {
      'test-model:security-alert-triage': {
        question: 'Triage this alert',
        toolTrail: ['alert.load'],
        stepCount: 1,
        toolCount: 1,
      },
    };

    const html = renderMatrixHtml(matrixWithSuite, configWithSuite, {}, traces);
    expect(html).toContain('Triage this alert');
    expect(html).toContain('alert.load');
    // The 'triage' column should have a trace; the 'Overall' column won't.
    // Check that at least the triage section shows the question, not 'Trace unavailable'.
    expect(html).toContain('Triage this alert');
    expect(html).toContain('alert.load');
  });
});
