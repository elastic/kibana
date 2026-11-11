/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { SECTIONED_LOGS_DASHBOARD } from '../fixtures/sectioned_logs_dashboard';
import type { PanelEditGold } from '../types';
import { dashboardPanelEditsEvaluator, matchesColorName } from './panel_edits';

const WRITE_STEP = {
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  results: [{ type: 'dashboard', data: { attachment_id: 'seed' } }],
};

const editPanel = (
  id: string,
  change: (panel: AttachmentPanel) => AttachmentPanel
): DashboardAttachmentData => {
  const update = (panel: AttachmentPanel) => (panel.id === id ? change(panel) : panel);
  return {
    ...SECTIONED_LOGS_DASHBOARD,
    panels: SECTIONED_LOGS_DASHBOARD.panels.map((widget) =>
      isSection(widget) ? { ...widget, panels: widget.panels.map(update) } : update(widget)
    ),
  };
};

const evaluateEdits = (
  panelEdits: readonly PanelEditGold[] | undefined,
  dashboard: DashboardAttachmentData,
  steps: Array<Record<string, unknown>> = [WRITE_STEP]
) =>
  dashboardPanelEditsEvaluator.evaluate({
    input: { question: 'q' },
    expected: { panelEdits },
    metadata: undefined,
    output: { errors: [], messages: [], steps, before: SECTIONED_LOGS_DASHBOARD, dashboard },
  });

/** A real write that leaves every panel the gold names as the seed had it. */
const UNRELATED_EDIT = editPanel('intro', (panel) => ({
  ...panel,
  config: { ...panel.config, content: '# Edited' },
}));

const redRequests: PanelEditGold = {
  panel: 'requests-over-time',
  config: { type: 'xy', title: 'Requests' },
  color: 'red',
};

const recolor = (color: string) => (panel: AttachmentPanel) => {
  const [layer] = panel.config.layers as Array<Record<string, unknown>>;
  return {
    ...panel,
    config: {
      ...panel.config,
      title: 'Requests',
      layers: [{ ...layer, y: [{ column: 'Value', color: { type: 'static', color } }] }],
    },
  };
};

describe('dashboard panel edits evaluator', () => {
  it('skips without gold and scores 0 when the agent never wrote the dashboard', async () => {
    expect((await evaluateEdits(undefined, SECTIONED_LOGS_DASHBOARD)).score).toBeNull();
    expect((await evaluateEdits([redRequests], SECTIONED_LOGS_DASHBOARD, [])).score).toBe(0);
  });

  it('passes a renamed chart with a red static color', async () => {
    const result = await evaluateEdits(
      [redRequests],
      editPanel('requests-over-time', recolor('#BD271E'))
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 when the write left the seed unchanged', async () => {
    expect((await evaluateEdits([redRequests], SECTIONED_LOGS_DASHBOARD)).score).toBe(0);
  });

  it('fails a panel the write did not edit', async () => {
    const result = await evaluateEdits([redRequests], UNRELATED_EDIT);
    expect(result.score).toBe(0);
    expect(result.explanation).toContain(
      'config.title: expected "Requests", got "Requests over time"'
    );
    expect(result.explanation).toContain('have no red');
  });

  it('scores the fraction of edited panels that match', async () => {
    const result = await evaluateEdits(
      [
        { panel: 'response-codes', config: { type: 'data_table' } },
        { panel: 'intro', type: 'markdown', bulletList: true },
      ],
      editPanel('intro', (panel) => ({
        ...panel,
        config: { content: '# Web traffic\n- Traffic: requests\n- Errors: 4xx and 5xx' },
      }))
    );
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain(
      'response-codes: config.type: expected "data_table", got "pie"'
    );
  });

  it('accepts any listed type alternative', async () => {
    const result = await evaluateEdits(
      [{ panel: 'response-codes', config: { type: ['pie', 'donut'] } }],
      UNRELATED_EDIT
    );
    expect(result.score).toBe(1);
  });

  it('matches a Vega spec gold against the parsed spec and finds its color', async () => {
    const recolored = editPanel('requests-by-os-vega', (panel) => {
      const spec = JSON.parse(String(panel.config.spec));
      return {
        ...panel,
        config: {
          ...panel.config,
          spec: JSON.stringify({ ...spec, mark: { type: 'bar', color: '#6092C0' } }),
        },
      };
    });
    const gold: PanelEditGold = {
      panel: 'requests-by-os-vega',
      type: 'vega',
      config: { spec: { mark: { type: 'bar' } } },
      color: 'blue',
    };
    expect((await evaluateEdits([gold], recolored)).score).toBe(1);
    expect((await evaluateEdits([{ ...gold, color: 'red' }], recolored)).score).toBe(0);
  });

  describe('color', () => {
    const withVegaSpec = (spec: string) =>
      editPanel('requests-by-os-vega', (panel) => ({
        ...panel,
        config: { ...panel.config, spec },
      }));
    const vegaColor = (color: PanelEditGold['color']): PanelEditGold => ({
      panel: 'requests-by-os-vega',
      color,
    });

    it('ignores a Lens color outside the series', async () => {
      const result = await evaluateEdits(
        [{ panel: 'requests-over-time', color: 'red' }],
        editPanel('requests-over-time', (panel) => ({
          ...panel,
          config: { ...panel.config, title_color: { type: 'static', color: '#BD271E' } },
        }))
      );
      expect(result.score).toBe(0);
    });

    it('ignores reference line and annotation colors', async () => {
      const result = await evaluateEdits(
        [{ panel: 'requests-over-time', color: 'red' }],
        editPanel('requests-over-time', (panel) => ({
          ...panel,
          config: {
            ...panel.config,
            layers: [
              ...(panel.config.layers as unknown[]),
              {
                type: 'reference_lines',
                thresholds: [{ value: 100, color: { type: 'static', color: '#BD271E' } }],
              },
              {
                type: 'annotations',
                events: [{ type: 'point', color: { type: 'static', color: '#BD271E' } }],
              },
            ],
          },
        }))
      );
      expect(result.score).toBe(0);
    });

    it('reads a color from the Vega config of a mark type', async () => {
      const spec = JSON.stringify({ mark: 'bar', config: { bar: { color: '#6092C0' } } });
      expect((await evaluateEdits([vegaColor('blue')], withVegaSpec(spec))).score).toBe(1);
    });

    it.each([
      [
        'a mark type the spec does not draw',
        { mark: 'bar', config: { line: { color: '#6092C0' } } },
      ],
      [
        'a mark that sets its own color',
        { mark: { type: 'bar', color: '#BD271E' }, config: { bar: { color: '#6092C0' } } },
      ],
      [
        'a mark type entry that overrides config.mark',
        { mark: 'bar', config: { mark: { color: '#6092C0' }, bar: { color: '#BD271E' } } },
      ],
      [
        'a mark colored by a field',
        {
          mark: 'bar',
          encoding: { color: { field: 'os' } },
          config: { bar: { color: '#6092C0' } },
        },
      ],
      [
        'a Vega mark filled from a scale',
        {
          marks: [{ type: 'rect', encode: { update: { fill: { scale: 'color', field: 'os' } } } }],
          config: { rect: { fill: '#6092C0' } },
        },
      ],
      [
        'a generic color under a config fill',
        { mark: 'bar', config: { bar: { fill: '#BD271E' }, mark: { color: '#6092C0' } } },
      ],
      [
        'a channel the mark is not drawn by',
        { mark: 'bar', config: { bar: { stroke: '#6092C0' } } },
      ],
      [
        'a filled point that sets its own fill',
        {
          mark: { type: 'point', filled: true },
          encoding: { fill: { field: 'os' } },
          config: { point: { color: '#6092C0' } },
        },
      ],
      [
        'the fill of a bar set unfilled in config',
        { mark: 'bar', config: { bar: { filled: false, fill: '#6092C0' } } },
      ],
    ])('ignores a Vega config color for %s', async (_, spec) => {
      expect(
        (await evaluateEdits([vegaColor('blue')], withVegaSpec(JSON.stringify(spec)))).score
      ).toBe(0);
    });

    it.each([
      [
        'a config fill when the mark only sets its stroke',
        { mark: { type: 'bar', stroke: '#BD271E' }, config: { bar: { fill: '#6092C0' } } },
      ],
      [
        'a config color when the mark strokes by a field',
        {
          mark: 'bar',
          encoding: { stroke: { field: 'os' } },
          config: { bar: { color: '#6092C0' } },
        },
      ],
      ['a config stroke on a line', { mark: 'line', config: { line: { stroke: '#6092C0' } } }],
      [
        'a config fill on a point the mark sets filled',
        { mark: { type: 'point', filled: true }, config: { point: { fill: '#6092C0' } } },
      ],
      [
        'a config fill on a point its config sets filled',
        { mark: 'point', config: { point: { filled: true, fill: '#6092C0' } } },
      ],
    ])('keeps %s', async (_, spec) => {
      expect(
        (await evaluateEdits([vegaColor('blue')], withVegaSpec(JSON.stringify(spec)))).score
      ).toBe(1);
    });

    it('reads a Vega spec written in HJSON', async () => {
      const spec = `{
        // Vega-Lite with comments and unquoted keys
        $schema: https://vega.github.io/schema/vega-lite/v5.json
        mark: {
          type: bar
          color: "#6092C0"
        }
      }`;
      expect((await evaluateEdits([vegaColor('blue')], withVegaSpec(spec))).score).toBe(1);
    });

    it('ignores Vega title, axis and background colors', async () => {
      const spec = JSON.stringify({
        background: '#BD271E',
        title: { text: 'Requests', color: '#BD271E' },
        mark: 'bar',
        encoding: { x: { field: 'os', axis: { labelColor: '#BD271E' } } },
      });
      expect((await evaluateEdits([vegaColor('red')], withVegaSpec(spec))).score).toBe(0);
    });

    it('finds the scheme of a top-level Vega scale', async () => {
      const spec = JSON.stringify({
        scales: [{ name: 'color', type: 'ordinal', scheme: 'blues' }],
        marks: [{ type: 'rect', encode: { update: { fill: { scale: 'color', field: 'os' } } } }],
      });
      expect((await evaluateEdits([vegaColor('blue')], withVegaSpec(spec))).score).toBe(1);
    });

    it('finds encoding and scale range colors in a nested layer', async () => {
      const spec = JSON.stringify({
        layer: [
          { mark: 'bar', encoding: { color: { value: '#BD271E' } } },
          { mark: 'line', encoding: { stroke: { field: 'os', scale: { range: ['#6092C0'] } } } },
        ],
      });
      const recolored = withVegaSpec(spec);
      expect((await evaluateEdits([vegaColor('red')], recolored)).score).toBe(1);
      expect((await evaluateEdits([vegaColor('blue')], recolored)).score).toBe(1);
    });

    it('lets an encoding color override the mark color of the same channel', async () => {
      const spec = JSON.stringify({
        mark: { type: 'bar', color: '#BD271E' },
        encoding: { color: { value: '#6092C0' } },
      });
      expect((await evaluateEdits([vegaColor('blue')], withVegaSpec(spec))).score).toBe(1);
      expect((await evaluateEdits([vegaColor('red')], withVegaSpec(spec))).score).toBe(0);
    });

    it('treats an unparseable spec as having no color', async () => {
      expect((await evaluateEdits([vegaColor('red')], withVegaSpec('{ mark: '))).score).toBe(0);
    });
  });

  it('checks a config value the panel only gets from the edit', async () => {
    const gold: PanelEditGold = {
      panel: 'request-rate-anomalies',
      config: { severity_threshold: 75 },
    };
    const raised = editPanel('request-rate-anomalies', (panel) => ({
      ...panel,
      config: { ...panel.config, severity_threshold: 75 },
    }));
    expect((await evaluateEdits([gold], raised)).score).toBe(1);
    const seedResult = await evaluateEdits([gold], UNRELATED_EDIT);
    expect(seedResult.explanation).toContain(
      'config.severity_threshold: expected 75, got undefined'
    );
  });

  it('checks the first added panel of a kind, ignoring seed panels of that kind', async () => {
    const gold: PanelEditGold = { panel: { added: 'markdown' }, config: { content: '# Note' } };
    const withNote = (content: string): DashboardAttachmentData => ({
      ...SECTIONED_LOGS_DASHBOARD,
      panels: [
        ...SECTIONED_LOGS_DASHBOARD.panels,
        {
          type: 'markdown',
          id: 'added-note',
          grid: { x: 0, y: 200, w: 48, h: 5 },
          config: { content },
        },
      ],
    });
    expect((await evaluateEdits([gold], withNote('# Note'))).score).toBe(1);
    expect((await evaluateEdits([gold], withNote('# Other'))).score).toBe(0);
    expect((await evaluateEdits([gold], UNRELATED_EDIT)).explanation).toContain(
      'added markdown not found'
    );
  });

  it('checks markdown terms and the Vega mark type of added panels', async () => {
    const withAdded = (content: string, mark: string): DashboardAttachmentData => ({
      ...SECTIONED_LOGS_DASHBOARD,
      panels: [
        ...SECTIONED_LOGS_DASHBOARD.panels,
        {
          type: 'markdown',
          id: 'added-note',
          grid: { x: 0, y: 200, w: 24, h: 5 },
          config: { content },
        },
        {
          type: 'vega',
          id: 'added-heatmap',
          grid: { x: 24, y: 200, w: 24, h: 5 },
          config: { spec: JSON.stringify({ layer: [{ mark: { type: mark } }] }) },
        },
      ],
    });
    const gold: PanelEditGold[] = [
      { panel: { added: 'markdown' }, contentIncludes: ['75', 'critical'] },
      { panel: { added: 'vega' }, vegaMark: 'rect' },
    ];
    expect(
      (await evaluateEdits(gold, withAdded('Scores above 75 are **Critical**.', 'rect'))).score
    ).toBe(1);
    const wrong = await evaluateEdits(gold, withAdded('Scores above 50 are critical.', 'bar'));
    expect(wrong.score).toBe(0);
    expect(wrong.explanation).toContain('content does not mention "75"');
    expect(wrong.explanation).toContain('spec draws no rect mark');
  });

  it('fails a panel the edit replaced under a new id', async () => {
    const result = await evaluateEdits(
      [{ panel: 'response-codes', config: { type: 'data_table' } }],
      editPanel('response-codes', (panel) => ({ ...panel, id: 'response-codes-table' }))
    );
    expect(result.explanation).toContain('response-codes not found');
  });
});

describe('matchesColorName', () => {
  it.each([
    'red',
    'crimson',
    'reds',
    '#f00',
    '#FF0000',
    '#BD271E',
    '#E7664C',
    '#ff000080',
    'rgb(189, 39, 30)',
  ])('%s is red', (color) => {
    expect(matchesColorName(color, 'red')).toBe(true);
  });

  it.each([
    '#54B399',
    '#6092C0',
    '#D6BF57',
    '#808080',
    '#ffcccc',
    '#330000',
    'navy',
    'not a color',
  ])('%s is not red', (color) => {
    expect(matchesColorName(color, 'red')).toBe(false);
  });

  it.each(['blue', 'navy', 'blues', '#6092C0'])('%s is blue', (color) => {
    expect(matchesColorName(color, 'blue')).toBe(true);
  });

  it('does not take a pale tint for the hue', () => {
    expect(matchesColorName('aliceblue', 'blue')).toBe(false);
  });
});
