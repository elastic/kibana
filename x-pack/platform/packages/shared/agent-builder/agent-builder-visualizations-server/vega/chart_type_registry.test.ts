/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RAW_VEGA_CATALOG_IDS } from './dialect';
import {
  catalogChartRules,
  catalogEsqlAdditionalInstructions,
  checkCatalogIntegrity,
  disclosedFallbackContextForCatalog,
  getRawVegaChartType,
  rawVegaChartTypeRegistry,
  rawVegaChartTypes,
  vegaLiteReferenceTypes,
} from './chart_type_registry';
import { formatRawChartRules } from './chart_types/types';

describe('chartTypeRegistry (Raw Vega)', () => {
  it('registers every allowlisted catalog id exactly once', () => {
    expect(rawVegaChartTypes.map((entry) => entry.id)).toEqual([...RAW_VEGA_CATALOG_IDS]);
    for (const id of RAW_VEGA_CATALOG_IDS) {
      const entry = rawVegaChartTypeRegistry[id];
      expect(entry.id).toBe(id);
      expect(entry.dialect).toBe('vega');
      expect(formatRawChartRules(entry).length).toBeGreaterThan(0);
      expect(entry.prompt.config.esqlAdditionalInstructions.length).toBeGreaterThan(0);
      expect(entry.prompt.selection.description.length).toBeGreaterThan(0);
      expect(entry.prompt.selection.title.length).toBeGreaterThan(0);
      expect(entry.example.load).toEqual(expect.any(Function));
    }
  });

  it('returns empty helpers for catalog none', () => {
    expect(getRawVegaChartType('none')).toBeUndefined();
    expect(catalogChartRules('none')).toBe('');
    expect(catalogEsqlAdditionalInstructions('none')).toBe('');
    expect(disclosedFallbackContextForCatalog('none')).toBe('');
    expect(checkCatalogIntegrity('none', { columns: [], values: [] })).toEqual({
      ok: true,
      error: '',
    });
  });

  it('dispatches integrity checks through the registry', () => {
    const missing = checkCatalogIntegrity('radar', {
      columns: [{ name: 'key', type: 'keyword' }],
      values: [['a']],
    });
    expect(missing.ok).toBe(false);
    expect(missing.error).toContain('radar');
  });

  it('formats catalog chart rules with heading and bullets', () => {
    const rules = catalogChartRules('sunburst');
    expect(rules).toContain('SUNBURST RULES:');
    expect(rules).toContain('- Use the Parent–child columns');
  });
});

describe('chartTypeRegistry (Vega-Lite references)', () => {
  it('registers VL reference skeletons with stable ids', () => {
    expect(vegaLiteReferenceTypes.map((entry) => entry.id)).toEqual([
      'layered_combo_dual_axis',
      'faceted_small_multiples',
      'scatter_bubble',
      'heatmap',
      'timeline_gantt',
      'calendar_heatmap',
    ]);
    for (const entry of vegaLiteReferenceTypes) {
      expect(entry.dialect).toBe('vega-lite');
      expect(entry.prompt.selection.title.length).toBeGreaterThan(0);
      expect(entry.prompt.selection.description.length).toBeGreaterThan(0);
      expect(entry.example.load).toEqual(expect.any(Function));
    }
  });
});
