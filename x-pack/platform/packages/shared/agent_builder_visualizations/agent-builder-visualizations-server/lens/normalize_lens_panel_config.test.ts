/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeLensPanelConfig } from './normalize_lens_panel_config';

describe('normalizeLensPanelConfig', () => {
  it('skips raw Lens attributes', () => {
    expect(
      normalizeLensPanelConfig({
        title: 'Raw',
        visualizationType: 'lnsXY',
        state: {},
        references: [],
      })
    ).toEqual({ skipped: 'raw_lens_attributes' });
  });

  it('skips unsupported chart types', () => {
    expect(normalizeLensPanelConfig({ type: 'legacy_metric', title: 'Old' })).toEqual({
      skipped: 'unsupported_chart_type',
    });
  });

  it('skips configs that fail conversion', () => {
    expect(normalizeLensPanelConfig({ type: 'metric' })).toEqual({
      skipped: 'conversion_failed',
    });
  });

  it('applies defects and keeps hide_title as a panel-level key', () => {
    const result = normalizeLensPanelConfig({
      type: 'metric',
      title: 'Total requests',
      data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*)' },
      metrics: [{ type: 'primary', column: 'count' }],
    });
    expect('config' in result).toBe(true);
    if (!('config' in result)) {
      return;
    }
    expect(result.config.hide_title).toBe(true);
    expect(result.changes.map((change) => change.id)).toContain('T1');
  });

  it('is idempotent', () => {
    const input = {
      type: 'xy',
      data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*) BY @timestamp' },
      layers: [
        {
          type: 'area',
          x: { column: '@timestamp' },
          y: [{ column: 'count' }],
          data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*) BY @timestamp' },
        },
      ],
    };
    const once = normalizeLensPanelConfig(input);
    expect('config' in once).toBe(true);
    if (!('config' in once)) {
      return;
    }
    const twice = normalizeLensPanelConfig(once.config);
    expect(twice).toEqual({ config: once.config, changes: [] });
  });
});
