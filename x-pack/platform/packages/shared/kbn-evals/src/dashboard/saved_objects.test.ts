/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  generateDashboardBody,
  generateDataViewBody,
  DASHBOARD_ID,
  DATA_VIEW_ID,
} from './saved_objects';

describe('generateDashboardBody', () => {
  const dashboard = generateDashboardBody();

  it('has the correct title and description', () => {
    expect(dashboard.title).toBe('@kbn/evals Dashboard');
    expect(dashboard.description).toContain('Evaluation scores overview');
  });

  it('produces exactly 8 inline panels', () => {
    expect(dashboard.panels).toHaveLength(8);
  });

  it('all panels have type "lens"', () => {
    for (const panel of dashboard.panels) {
      expect(panel.type).toBe('lens');
    }
  });

  it('all panels have unique uids', () => {
    const uids = dashboard.panels.map((p) => p.uid);
    expect(new Set(uids).size).toBe(uids.length);
  });

  it('all panels have valid grid coordinates', () => {
    for (const panel of dashboard.panels) {
      expect(panel.grid.x).toBeGreaterThanOrEqual(0);
      expect(panel.grid.y).toBeGreaterThanOrEqual(0);
      expect(panel.grid.w).toBeGreaterThan(0);
      expect(panel.grid.h).toBeGreaterThan(0);
    }
  });

  it('all panels have config with Lens state structure', () => {
    for (const panel of dashboard.panels) {
      expect(panel.config).toHaveProperty('title');
      expect(panel.config).toHaveProperty('visualizationType');
      expect(panel.config).toHaveProperty('state');
      expect(panel.config.state).toHaveProperty('datasourceStates');
      expect(panel.config.state).toHaveProperty('visualization');
      expect(panel.config.state).toHaveProperty('filters');
      expect(panel.config.state).toHaveProperty('query');
    }
  });

  it('all panels reference the evals data view', () => {
    for (const panel of dashboard.panels) {
      const hasDataViewRef = panel.config.references.some(
        (ref) => ref.type === 'index-pattern' && ref.id === DATA_VIEW_ID
      );
      expect(hasDataViewRef).toBe(true);
    }
  });

  it('has correct dashboard options', () => {
    expect(dashboard.options.auto_apply_filters).toBe(true);
    expect(dashboard.options.use_margins).toBe(true);
    expect(dashboard.options.sync_cursor).toBe(true);
  });

  it('has a 30-day time range', () => {
    expect(dashboard.time_range).toEqual({ from: 'now-30d', to: 'now' });
  });

  it('is deterministic across repeated calls', () => {
    const first = JSON.stringify(generateDashboardBody());
    const second = JSON.stringify(generateDashboardBody());
    expect(first).toBe(second);
  });
});

describe('panel visualization types', () => {
  const dashboard = generateDashboardBody();

  it.each([
    ['panel-score-trend', 'lnsXY'],
    ['panel-model-comparison', 'lnsXY'],
    ['panel-evaluator-heatmap', 'lnsHeatmap'],
    ['panel-pass-rate', 'lnsXY'],
    ['panel-token-usage', 'lnsXY'],
    ['panel-latency-distribution', 'lnsXY'],
    ['panel-regression-highlight', 'lnsMetric'],
    ['panel-per-suite-breakdown', 'lnsDatatable'],
  ])('panel %s has visualizationType %s', (uid, expectedType) => {
    const panel = dashboard.panels.find((p) => p.uid === uid);
    expect(panel).toBeDefined();
    expect(panel!.config.visualizationType).toBe(expectedType);
  });
});

describe('Score Trend panel', () => {
  const panel = generateDashboardBody().panels.find((p) => p.uid === 'panel-score-trend')!;

  it('uses line chart series type', () => {
    const viz = panel.config.state.visualization as Record<string, unknown>;
    expect(viz.preferredSeriesType).toBe('line');
  });

  it('has timestamp, breakdown, and score columns', () => {
    const layers = panel.config.state.datasourceStates.formBased.layers as Record<string, Record<string, unknown>>;
    const layer = Object.values(layers)[0];
    const columns = layer.columns as Record<string, Record<string, unknown>>;

    expect(columns.timestamp.sourceField).toBe('@timestamp');
    expect(columns.score.sourceField).toBe('evaluator.score');
    expect(columns.breakdown.sourceField).toBe('evaluator.name');
  });
});

describe('Model Comparison panel', () => {
  const panel = generateDashboardBody().panels.find((p) => p.uid === 'panel-model-comparison')!;

  it('uses bar_grouped series type', () => {
    const viz = panel.config.state.visualization as Record<string, unknown>;
    expect(viz.preferredSeriesType).toBe('bar_grouped');
  });

  it('groups by task.model.id', () => {
    const layers = panel.config.state.datasourceStates.formBased.layers as Record<string, Record<string, unknown>>;
    const layer = Object.values(layers)[0];
    const columns = layer.columns as Record<string, Record<string, unknown>>;
    expect(columns.model.sourceField).toBe('task.model.id');
  });
});

describe('Evaluator Heatmap panel', () => {
  const panel = generateDashboardBody().panels.find((p) => p.uid === 'panel-evaluator-heatmap')!;

  it('maps dataset x evaluator to score', () => {
    const viz = panel.config.state.visualization as Record<string, unknown>;
    expect(viz.xAccessor).toBe('dataset');
    expect(viz.yAccessor).toBe('evaluator');
    expect(viz.valueAccessor).toBe('score');
  });
});

describe('Pass Rate panel', () => {
  const panel = generateDashboardBody().panels.find((p) => p.uid === 'panel-pass-rate')!;

  it('uses area chart', () => {
    const viz = panel.config.state.visualization as Record<string, unknown>;
    expect(viz.preferredSeriesType).toBe('area');
  });

  it('groups by run_id', () => {
    const layers = panel.config.state.datasourceStates.formBased.layers as Record<string, Record<string, unknown>>;
    const layer = Object.values(layers)[0];
    const columns = layer.columns as Record<string, Record<string, unknown>>;
    expect(columns.runId.sourceField).toBe('run_id');
  });
});

describe('Per-Suite Breakdown panel', () => {
  const panel = generateDashboardBody().panels.find((p) => p.uid === 'panel-per-suite-breakdown')!;

  it('is a datatable', () => {
    expect(panel.config.visualizationType).toBe('lnsDatatable');
  });

  it('has dataset, evaluator, and 5 stat columns', () => {
    const layers = panel.config.state.datasourceStates.formBased.layers as Record<string, Record<string, unknown>>;
    const layer = Object.values(layers)[0];
    const columnOrder = layer.columnOrder as string[];
    expect(columnOrder).toEqual(['dataset', 'evaluator', 'mean', 'median', 'stdDev', 'min', 'max']);
  });
});

describe('generateDataViewBody', () => {
  const dataViewBody = generateDataViewBody();

  it('has the correct ID', () => {
    expect(dataViewBody.data_view.id).toBe(DATA_VIEW_ID);
  });

  it('uses the kibana-evaluations* index pattern', () => {
    expect(dataViewBody.data_view.title).toBe('kibana-evaluations*');
  });

  it('sets @timestamp as the time field', () => {
    expect(dataViewBody.data_view.timeFieldName).toBe('@timestamp');
  });
});

describe('exported constants', () => {
  it('DASHBOARD_ID uses the evals prefix', () => {
    expect(DASHBOARD_ID).toBe('evals-dashboard');
  });

  it('DATA_VIEW_ID uses the evals prefix', () => {
    expect(DATA_VIEW_ID).toBe('evals-data-view');
  });
});
