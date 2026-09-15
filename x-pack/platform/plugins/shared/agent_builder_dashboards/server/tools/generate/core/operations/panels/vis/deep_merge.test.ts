/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepMergeConfig } from './deep_merge';

describe('deepMergeConfig', () => {
  it('merges top-level keys and keeps untouched base keys', () => {
    const base = { type: 'xy', title: 'Errors', description: 'desc' };

    expect(deepMergeConfig(base, { title: '' })).toEqual({
      type: 'xy',
      title: '',
      description: 'desc',
    });
  });

  it('deep-merges nested objects without dropping siblings', () => {
    const base = {
      type: 'xy',
      visualization: { legend: { isVisible: true }, layers: [{ id: 'layer-1' }] },
    };

    expect(deepMergeConfig(base, { visualization: { legend: { isVisible: false } } })).toEqual({
      type: 'xy',
      visualization: { legend: { isVisible: false }, layers: [{ id: 'layer-1' }] },
    });
  });

  it('replaces arrays instead of concatenating them', () => {
    const base = { filters: [{ id: 'a' }], visualization: { layers: [{ id: 'old' }] } };

    expect(deepMergeConfig(base, { visualization: { layers: [{ id: 'new' }] } })).toEqual({
      filters: [{ id: 'a' }],
      visualization: { layers: [{ id: 'new' }] },
    });
  });

  it('does not mutate the source objects', () => {
    const base = { title: 'Errors', visualization: { legend: { isVisible: true } } };
    const patch = { visualization: { legend: { isVisible: false } } };

    deepMergeConfig(base, patch);

    expect(base).toEqual({ title: 'Errors', visualization: { legend: { isVisible: true } } });
    expect(patch).toEqual({ visualization: { legend: { isVisible: false } } });
  });
});
