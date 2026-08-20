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
  columns: [
    {
      id: 'alert',
      label: 'Alert Analysis',
      group: 'Agent Builder',
      suites: ['suite-1'],
      weight: 1,
    },
    {
      id: 'threat',
      label: 'Threat Hunting',
      group: 'Agent Builder',
      suites: ['suite-2'],
      weight: 1,
    },
  ],
  composites: [],
  models: [{ id: 'test-model', label: 'Test Model', openSource: false }],
};

const mockMatrix: Matrix = {
  columns: [
    { id: 'alert', label: 'Alert Analysis', group: 'Agent Builder' },
    { id: 'threat', label: 'Threat Hunting', group: 'Agent Builder' },
  ],
  composites: [],
  displayColumns: [
    { id: 'alert', label: 'Alert Analysis', kind: 'base' },
    { id: 'threat', label: 'Threat Hunting', kind: 'base' },
    { id: '__overall__', label: 'Overall', kind: 'overall' },
  ],
  overallLabel: 'Overall',
  proprietary: [
    {
      modelId: 'test-model',
      modelLabel: 'Test Model',
      openSource: false,
      cells: {
        alert: { kind: 'score', value: 8.5 },
        threat: { kind: 'score', value: 7.4 },
      },
      overall: { kind: 'score', value: 7.95 },
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
    // The 'triage' column resolves its trace via the suite ID fallback.
    expect(html).toContain('Triage this alert');
    expect(html).toContain('alert.load');
  });

  it('renders grouped column headers when groups are present', () => {
    const html = renderMatrixHtml(mockMatrix, mockConfig);
    expect(html).toContain('colspan="2"');
    expect(html).toContain('Agent Builder');
  });

  it('does not render a grouped header when no groups are present', () => {
    const ungroupedConfig: MatrixConfig = {
      ...mockConfig,
      columns: [{ id: 'alert', label: 'Alert Analysis', suites: ['suite-1'], weight: 1 }],
    };
    const ungroupedMatrix: Matrix = {
      ...mockMatrix,
      columns: [{ id: 'alert', label: 'Alert Analysis' }],
      displayColumns: [
        { id: 'alert', label: 'Alert Analysis', kind: 'base' },
        { id: '__overall__', label: 'Overall', kind: 'overall' },
      ],
    };
    const html = renderMatrixHtml(ungroupedMatrix, ungroupedConfig);
    expect(html).not.toContain('colspan="2"');
    expect(html).not.toContain('Agent Builder');
  });

  it('strips non-http(s) link targets from markdown answers', () => {
    const traces: MatrixTraceData = {
      'test-model:alert': {
        question: 'q',
        toolTrail: [],
        answer:
          'Safe: [elastic](https://elastic.co) and [guide](http://example.com). ' +
          'Bad: [click](javascript:alert(1)) and [x](data:text/html;base64,AAAA).',
        stepCount: 0,
        toolCount: 0,
      },
    };

    const html = renderMatrixHtml(mockMatrix, mockConfig, {}, traces);
    // Safe links render as anchors.
    expect(html).toContain('<a href="https://elastic.co">elastic</a>');
    expect(html).toContain('<a href="http://example.com">guide</a>');
    // Dangerous schemes are not emitted into href attributes.
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="data:');
    // The link text is preserved (dropped back to plain text).
    expect(html).toContain('click');
    expect(html).toContain('x');
  });

  it('renders markdown pipe tables as HTML tables, not paragraph soup', () => {
    const traces: MatrixTraceData = {
      'test-model:alert': {
        question: 'q',
        toolTrail: [],
        answer:
          '| Field | Value |\n' +
          '|-------|-------|\n' +
          '| **Process** | `BluetoothService.exe` |\n' +
          '| **User Context** | SYSTEM |\n\n' +
          '### Context\n- item one\n- item two',
        stepCount: 0,
        toolCount: 0,
      },
    };

    const html = renderMatrixHtml(mockMatrix, mockConfig, {}, traces);
    // The table is recognized and rendered as a real table element.
    expect(html).toContain('<table class="md"><thead><tr>');
    expect(html).toContain('<th>Field</th>');
    expect(html).toContain('<th>Value</th>');
    expect(html).toContain('<td><strong>Process</strong></td>');
    expect(html).toContain('<td><code>BluetoothService.exe</code></td>');
    // Raw pipes must not leak as paragraph text once a table is parsed.
    expect(html).not.toMatch(/<p>\|/);
    // Content after the table still renders normally.
    expect(html).toContain('<h6>Context</h6>');
  });

  it('renders blockquote lines and escapes cell content in tables', () => {
    const traces: MatrixTraceData = {
      'test-model:alert': {
        question: 'q',
        toolTrail: [],
        answer:
          '> quoted note <script>alert(1)</script>\n' +
          '| a | b |\n' +
          '|---|---|\n' +
          '| <img src=x onerror=alert(1)> | plain |',
        stepCount: 0,
        toolCount: 0,
      },
    };

    const html = renderMatrixHtml(mockMatrix, mockConfig, {}, traces);
    expect(html).toContain('<blockquote>');
    // Untrusted cell/script content is escaped, never emitted as live HTML.
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders fenced code blocks verbatim, protecting ES|QL pipes from table parsing', () => {
    const traces: MatrixTraceData = {
      'test-model:alert': {
        question: 'q',
        toolTrail: [],
        answer:
          'Query:\n```\nFROM logs-endpoint.events.library-*\n' +
          '| WHERE event.category == "library" AND dll.name == "log.dll"\n' +
          '| STATS load_count = COUNT(*) BY host.name\n```\nDone.',
        stepCount: 0,
        toolCount: 0,
      },
    };

    const html = renderMatrixHtml(mockMatrix, mockConfig, {}, traces);
    expect(html).toContain('<pre><code>FROM logs-endpoint.events.library-*');
    // Pipes inside the code block must NOT become a markdown table.
    expect(html).not.toContain('<table class="md"><thead><tr><th>FROM logs');
    expect(html).not.toMatch(/<p>\| WHERE/);
    expect(html).toContain('Done.');
  });
});
