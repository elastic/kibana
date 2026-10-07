/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EPISODES_PANELS_STORAGE_PREFIX,
  getHistogramHidden,
  getKpisHidden,
  setHistogramHidden,
  setKpisHidden,
} from './episodes_panels_visibility';

describe('episodes_panels_visibility', () => {
  const createStorage = () => {
    const store = new Map<string, unknown>();
    return {
      get: jest.fn((key: string) => store.get(key)),
      set: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
      }),
      remove: jest.fn(),
      clear: jest.fn(),
    };
  };

  it('defaults KPIs and histogram to visible', () => {
    const storage = createStorage();
    expect(getKpisHidden(storage as any)).toBe(false);
    expect(getHistogramHidden(storage as any)).toBe(false);
  });

  it('persists KPI and histogram visibility under the alerts prefix', () => {
    const storage = createStorage();
    setKpisHidden(storage as any, true);
    setHistogramHidden(storage as any, true);

    expect(storage.set).toHaveBeenCalledWith(
      `${EPISODES_PANELS_STORAGE_PREFIX}:kpisHidden`,
      true
    );
    expect(storage.set).toHaveBeenCalledWith(
      `${EPISODES_PANELS_STORAGE_PREFIX}:chartHidden`,
      true
    );
    expect(getKpisHidden(storage as any)).toBe(true);
    expect(getHistogramHidden(storage as any)).toBe(true);
  });
});
