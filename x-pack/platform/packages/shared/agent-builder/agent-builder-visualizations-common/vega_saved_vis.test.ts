/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildVegaSavedVis,
  extractVegaSpecFromSavedVis,
  normalizeVegaConfig,
  VEGA_VIS_TYPE,
} from './vega_saved_vis';

describe('buildVegaSavedVis', () => {
  it('wraps a spec into the by-value legacy-vis savedVis shape', () => {
    const spec = '{"$schema":"https://vega.github.io/schema/vega-lite/v6.json"}';

    expect(buildVegaSavedVis({ spec, title: 'My chart', description: 'desc' })).toEqual({
      title: 'My chart',
      description: 'desc',
      type: VEGA_VIS_TYPE,
      params: { spec },
      uiState: {},
      data: { aggs: [], searchSource: {} },
    });
  });

  it('defaults the title and description to empty strings when omitted', () => {
    const savedVis = buildVegaSavedVis({ spec: '{}' });
    expect(savedVis.title).toBe('');
    expect(savedVis.description).toBe('');
  });
});

describe('extractVegaSpecFromSavedVis', () => {
  it('reads the spec, title, and description from a Vega legacy-vis config', () => {
    const spec = '{"mark":"bar"}';
    const config = {
      savedVis: {
        type: 'vega',
        title: 'Title',
        description: 'Desc',
        params: { spec },
      },
    };

    expect(extractVegaSpecFromSavedVis(config)).toEqual({
      spec,
      title: 'Title',
      description: 'Desc',
    });
  });

  it('returns undefined for a non-Vega savedVis', () => {
    expect(
      extractVegaSpecFromSavedVis({ savedVis: { type: 'markdown', params: { spec: 'x' } } })
    ).toBeUndefined();
  });

  it('returns undefined when there is no savedVis or spec', () => {
    expect(extractVegaSpecFromSavedVis({ attributes: {} })).toBeUndefined();
    expect(extractVegaSpecFromSavedVis({ savedVis: { type: 'vega', params: {} } })).toBeUndefined();
    expect(extractVegaSpecFromSavedVis(undefined)).toBeUndefined();
  });
});

describe('normalizeVegaConfig', () => {
  it('reads spec, title, and description from an untyped attachment payload', () => {
    expect(normalizeVegaConfig({ spec: '{"mark":"bar"}', title: 'T', description: 'D' })).toEqual({
      spec: '{"mark":"bar"}',
      title: 'T',
      description: 'D',
    });
  });

  it('omits title/description when they are not strings', () => {
    expect(normalizeVegaConfig({ spec: '{}', title: 5 })).toEqual({ spec: '{}' });
  });

  it('returns undefined when the spec is missing or empty', () => {
    expect(normalizeVegaConfig({ title: 'T' })).toBeUndefined();
    expect(normalizeVegaConfig({ spec: '' })).toBeUndefined();
    expect(normalizeVegaConfig(undefined)).toBeUndefined();
  });
});
