/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RAW_VEGA_CATALOG_IDS } from './dialect';
import {
  RAW_VEGA_CATALOG,
  RAW_VEGA_CATALOG_ENTRIES,
  catalogChartRules,
  catalogEsqlAdditionalInstructions,
  checkCatalogIntegrity,
  disclosedFallbackContextForCatalog,
  getRawVegaCatalogEntry,
} from './raw_vega_catalog';

describe('RAW_VEGA_CATALOG', () => {
  it('registers every allowlisted catalog id exactly once', () => {
    expect(RAW_VEGA_CATALOG_ENTRIES.map((entry) => entry.id)).toEqual([...RAW_VEGA_CATALOG_IDS]);
    for (const id of RAW_VEGA_CATALOG_IDS) {
      expect(RAW_VEGA_CATALOG[id].id).toBe(id);
      expect(RAW_VEGA_CATALOG[id].chartRules.length).toBeGreaterThan(0);
      expect(RAW_VEGA_CATALOG[id].esqlAdditionalInstructions.length).toBeGreaterThan(0);
      expect(RAW_VEGA_CATALOG[id].example.id).toBe(id);
      expect(RAW_VEGA_CATALOG[id].classifierDescription.length).toBeGreaterThan(0);
    }
  });

  it('returns empty helpers for catalog none', () => {
    expect(getRawVegaCatalogEntry('none')).toBeUndefined();
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
});
