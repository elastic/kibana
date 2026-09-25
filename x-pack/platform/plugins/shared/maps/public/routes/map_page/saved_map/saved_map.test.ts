/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services', () => ({
  getMapsCapabilities: () => ({ save: true }),
  getEMSSettings: () => ({ isEMSEnabled: () => false, isEMSUrlSet: () => false }),
  getMapsEmsStart: () => ({ config: {} }),
  getShowMapsInspectorAdapter: () => false,
  getTimeFilter: () => ({
    getTime: () => ({ from: 'now-15m', to: 'now' }),
    getRefreshInterval: () => undefined,
  }),
  getUsageCollection: () => null,
}));

jest.mock('../../../licensed_features', () => ({
  whenLicenseInitialized: jest.fn().mockResolvedValue(undefined),
  notifyLicensedFeatureUsage: jest.fn(),
  getLicenseId: jest.fn().mockReturnValue('basic'),
}));

import { SavedMap } from './saved_map';
import { getMapCenter, getMapZoom } from '../../../selectors/map_selectors';
import type { MapByValueState } from '../../../../common/embeddable/types';

describe('SavedMap.initializeStore map center', () => {
  test('uses mapCenter from mapEmbeddableState instead of by-value map attributes center', async () => {
    const mapEmbeddableState: MapByValueState = {
      attributes: {
        title: 'test map',
        center: { lat: 0, lon: 0 },
        zoom: 1,
      } as MapByValueState['attributes'],
      mapCenter: { lat: 40, lon: -105, zoom: 8 },
    };

    const savedMap = new SavedMap({ mapEmbeddableState });
    await savedMap.whenReady();

    const state = savedMap.getStore().getState();
    expect(getMapCenter(state)).toEqual({ lat: 40, lon: -105 });
    expect(getMapZoom(state)).toBe(8);
  });

  test('falls back to by-value map attributes center when mapCenter is absent from mapEmbeddableState', async () => {
    const mapEmbeddableState: MapByValueState = {
      attributes: {
        title: 'test map',
        center: { lat: 51, lon: -0.1 },
        zoom: 12,
      } as MapByValueState['attributes'],
    };

    const savedMap = new SavedMap({ mapEmbeddableState });
    await savedMap.whenReady();

    const state = savedMap.getStore().getState();
    expect(getMapCenter(state)).toEqual({ lat: 51, lon: -0.1 });
    expect(getMapZoom(state)).toBe(12);
  });
});
