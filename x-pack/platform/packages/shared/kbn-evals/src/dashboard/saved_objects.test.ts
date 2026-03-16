/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  generateSavedObjects,
  generateNdjson,
  getAllManagedIds,
  SAVED_OBJECT_IDS,
} from './saved_objects';

describe('generateSavedObjects', () => {
  const savedObjects = generateSavedObjects();

  it('returns exactly 10 saved objects (1 data view + 8 visualizations + 1 dashboard)', () => {
    expect(savedObjects).toHaveLength(10);
  });

  it('all IDs use the deterministic evals- prefix', () => {
    for (const obj of savedObjects) {
      expect(obj.id).toMatch(/^evals-/);
    }
  });

  it('all objects have type, id, attributes, and references', () => {
    for (const obj of savedObjects) {
      expect(obj).toHaveProperty('type');
      expect(obj).toHaveProperty('id');
      expect(obj).toHaveProperty('attributes');
      expect(obj).toHaveProperty('references');
      expect(typeof obj.type).toBe('string');
      expect(typeof obj.id).toBe('string');
      expect(Array.isArray(obj.references)).toBe(true);
    }
  });

  it('produces unique IDs across all objects', () => {
    const ids = savedObjects.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is deterministic across repeated calls', () => {
    const first = JSON.stringify(generateSavedObjects());
    const second = JSON.stringify(generateSavedObjects());
    expect(first).toBe(second);
  });
});

describe('data view', () => {
  const dataView = generateSavedObjects().find((o) => o.type === 'index-pattern')!;

  it('has the correct ID', () => {
    expect(dataView.id).toBe(SAVED_OBJECT_IDS.dataView);
  });

  it('uses the kibana-evaluations* index pattern', () => {
    expect(dataView.attributes.title).toBe('kibana-evaluations*');
  });

  it('sets @timestamp as the time field', () => {
    expect(dataView.attributes.timeFieldName).toBe('@timestamp');
  });

  it('has an empty references array', () => {
    expect(dataView.references).toEqual([]);
  });
});

describe('Lens visualizations', () => {
  const lensObjects = generateSavedObjects().filter((o) => o.type === 'lens');

  it('produces exactly 8 lens saved objects', () => {
    expect(lensObjects).toHaveLength(8);
  });

  it('every lens object references the evals data view', () => {
    for (const lens of lensObjects) {
      const hasDataViewRef = lens.references.some(
        (ref) => ref.type === 'index-pattern' && ref.id === SAVED_OBJECT_IDS.dataView
      );
      expect(hasDataViewRef).toBe(true);
    }
  });

  it('every lens object has a state with datasourceStates and visualization', () => {
    for (const lens of lensObjects) {
      const state = lens.attributes.state as Record<string, unknown>;
      expect(state).toHaveProperty('datasourceStates');
      expect(state).toHaveProperty('visualization');
      expect(state).toHaveProperty('filters');
      expect(state).toHaveProperty('query');
    }
  });

  it('every lens object has a visualizationType', () => {
    for (const lens of lensObjects) {
      expect(lens.attributes).toHaveProperty('visualizationType');
      expect(typeof lens.attributes.visualizationType).toBe('string');
    }
  });

  it.each([
    [SAVED_OBJECT_IDS.scoreTrend, 'lnsXY'],
    [SAVED_OBJECT_IDS.modelComparison, 'lnsXY'],
    [SAVED_OBJECT_IDS.evaluatorHeatmap, 'lnsHeatmap'],
    [SAVED_OBJECT_IDS.passRate, 'lnsXY'],
    [SAVED_OBJECT_IDS.tokenUsage, 'lnsXY'],
    [SAVED_OBJECT_IDS.latencyDistribution, 'lnsXY'],
    [SAVED_OBJECT_IDS.regressionHighlight, 'lnsMetric'],
    [SAVED_OBJECT_IDS.perSuiteBreakdown, 'lnsDatatable'],
  ])('visualization %s has type %s', (id, expectedType) => {
    const lens = lensObjects.find((o) => o.id === id);
    expect(lens).toBeDefined();
    expect(lens!.attributes.visualizationType).toBe(expectedType);
  });
});

describe('Score Trend visualization', () => {
  const scoreTrend = generateSavedObjects().find((o) => o.id === SAVED_OBJECT_IDS.scoreTrend)!;

  it('uses line chart series type', () => {
    const viz = (scoreTrend.attributes.state as Record<string, unknown>).visualization as Record<
      string,
      unknown
    >;
    expect(viz.preferredSeriesType).toBe('line');
  });

  it('has timestamp, breakdown, and score columns', () => {
    const state = scoreTrend.attributes.state as Record<string, unknown>;
    const dsStates = state.datasourceStates as Record<string, unknown>;
    const formBased = dsStates.formBased as Record<string, unknown>;
    const layers = formBased.layers as Record<string, Record<string, unknown>>;
    const layer = Object.values(layers)[0];
    const columns = layer.columns as Record<string, Record<string, unknown>>;

    expect(columns.timestamp.sourceField).toBe('@timestamp');
    expect(columns.score.sourceField).toBe('evaluator.score');
    expect(columns.breakdown.sourceField).toBe('evaluator.name');
  });
});

describe('Model Comparison visualization', () => {
  const modelComparison = generateSavedObjects().find(
    (o) => o.id === SAVED_OBJECT_IDS.modelComparison
  )!;

  it('uses bar_grouped series type', () => {
    const viz = (modelComparison.attributes.state as Record<string, unknown>)
      .visualization as Record<string, unknown>;
    expect(viz.preferredSeriesType).toBe('bar_grouped');
  });

  it('groups by task.model.id', () => {
    const state = modelComparison.attributes.state as Record<string, unknown>;
    const dsStates = state.datasourceStates as Record<string, unknown>;
    const formBased = dsStates.formBased as Record<string, unknown>;
    const layers = formBased.layers as Record<string, Record<string, unknown>>;
    const layer = Object.values(layers)[0];
    const columns = layer.columns as Record<string, Record<string, unknown>>;

    expect(columns.model.sourceField).toBe('task.model.id');
  });
});

describe('Evaluator Heatmap visualization', () => {
  const heatmap = generateSavedObjects().find((o) => o.id === SAVED_OBJECT_IDS.evaluatorHeatmap)!;

  it('uses lnsHeatmap type', () => {
    expect(heatmap.attributes.visualizationType).toBe('lnsHeatmap');
  });

  it('maps dataset x evaluator → score', () => {
    const viz = (heatmap.attributes.state as Record<string, unknown>).visualization as Record<
      string,
      unknown
    >;
    expect(viz.xAccessor).toBe('dataset');
    expect(viz.yAccessor).toBe('evaluator');
    expect(viz.valueAccessor).toBe('score');
  });
});

describe('Pass Rate visualization', () => {
  const passRate = generateSavedObjects().find((o) => o.id === SAVED_OBJECT_IDS.passRate)!;

  it('uses area chart', () => {
    const viz = (passRate.attributes.state as Record<string, unknown>).visualization as Record<
      string,
      unknown
    >;
    expect(viz.preferredSeriesType).toBe('area');
  });

  it('groups by run_id', () => {
    const state = passRate.attributes.state as Record<string, unknown>;
    const dsStates = state.datasourceStates as Record<string, unknown>;
    const formBased = dsStates.formBased as Record<string, unknown>;
    const layers = formBased.layers as Record<string, Record<string, unknown>>;
    const layer = Object.values(layers)[0];
    const columns = layer.columns as Record<string, Record<string, unknown>>;

    expect(columns.runId.sourceField).toBe('run_id');
  });
});

describe('Per-Suite Breakdown', () => {
  const breakdown = generateSavedObjects().find(
    (o) => o.id === SAVED_OBJECT_IDS.perSuiteBreakdown
  )!;

  it('is a datatable', () => {
    expect(breakdown.attributes.visualizationType).toBe('lnsDatatable');
  });

  it('has dataset, evaluator, and 5 stat columns', () => {
    const state = breakdown.attributes.state as Record<string, unknown>;
    const dsStates = state.datasourceStates as Record<string, unknown>;
    const formBased = dsStates.formBased as Record<string, unknown>;
    const layers = formBased.layers as Record<string, Record<string, unknown>>;
    const layer = Object.values(layers)[0];
    const columnOrder = layer.columnOrder as string[];

    expect(columnOrder).toEqual(['dataset', 'evaluator', 'mean', 'median', 'stdDev', 'min', 'max']);
  });
});

describe('dashboard', () => {
  const dashboard = generateSavedObjects().find((o) => o.type === 'dashboard')!;

  it('has the deterministic dashboard ID', () => {
    expect(dashboard.id).toBe(SAVED_OBJECT_IDS.dashboard);
  });

  it('references all 8 lens visualizations', () => {
    const lensRefs = dashboard.references.filter((r) => r.type === 'lens');
    expect(lensRefs).toHaveLength(8);
  });

  it('references every visualization ID from SAVED_OBJECT_IDS', () => {
    const refIds = new Set(dashboard.references.map((r) => r.id));
    const vizIds = [
      SAVED_OBJECT_IDS.scoreTrend,
      SAVED_OBJECT_IDS.modelComparison,
      SAVED_OBJECT_IDS.evaluatorHeatmap,
      SAVED_OBJECT_IDS.passRate,
      SAVED_OBJECT_IDS.tokenUsage,
      SAVED_OBJECT_IDS.latencyDistribution,
      SAVED_OBJECT_IDS.regressionHighlight,
      SAVED_OBJECT_IDS.perSuiteBreakdown,
    ];
    for (const vizId of vizIds) {
      expect(refIds).toContain(vizId);
    }
  });

  it('has panelsJSON with 8 panels', () => {
    const panels = JSON.parse(dashboard.attributes.panelsJSON as string) as unknown[];
    expect(panels).toHaveLength(8);
  });

  it('has controlGroupInput with 4 controls', () => {
    const controls = dashboard.attributes.controlGroupInput as Record<string, unknown>;
    const panelEntries = Object.keys(controls.panels as Record<string, unknown>);
    expect(panelEntries).toHaveLength(4);
  });

  it('has time restore enabled with 30-day window', () => {
    expect(dashboard.attributes.timeRestore).toBe(true);
    expect(dashboard.attributes.timeFrom).toBe('now-30d');
    expect(dashboard.attributes.timeTo).toBe('now');
  });
});

describe('generateNdjson', () => {
  it('returns a string with one JSON object per line', () => {
    const ndjson = generateNdjson();
    const lines = ndjson.split('\n');
    expect(lines).toHaveLength(10);

    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('each line has type and id at the top level', () => {
    const lines = generateNdjson().split('\n');
    for (const line of lines) {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      expect(parsed).toHaveProperty('type');
      expect(parsed).toHaveProperty('id');
    }
  });
});

describe('getAllManagedIds', () => {
  it('returns type/id pairs for all generated objects', () => {
    const managedIds = getAllManagedIds();
    const generated = generateSavedObjects();

    expect(managedIds).toHaveLength(generated.length);

    for (const { type, id } of managedIds) {
      const match = generated.find((o) => o.type === type && o.id === id);
      expect(match).toBeDefined();
    }
  });
});
