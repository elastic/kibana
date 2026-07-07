/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { consumeSmvContextLoadResult, getSmvContextLoadErrorMessages } from './smv_host_wiring';

describe('smv_host_wiring', () => {
  describe('getSmvContextLoadErrorMessages', () => {
    it('returns all four error message keys', () => {
      const messages = getSmvContextLoadErrorMessages('fc-1');
      expect(messages).toEqual(
        expect.objectContaining({
          metric: expect.any(String),
          swimlane: expect.any(String),
          entityCounts: expect.any(String),
          forecast: expect.any(String),
        })
      );
    });
  });

  describe('consumeSmvContextLoadResult', () => {
    it('does nothing when result is null', () => {
      const applyStatePatch = jest.fn();
      consumeSmvContextLoadResult({
        result: null,
        isUnmounted: () => false,
        loadCounterWhenStarted: 1,
        readLoadCounter: () => 1,
        syncPreviousSelectedForecastIdFromProps: jest.fn(),
        applyStatePatch,
      });
      expect(applyStatePatch).not.toHaveBeenCalled();
    });

    it('does nothing when load counter has advanced', () => {
      const applyStatePatch = jest.fn();
      consumeSmvContextLoadResult({
        result: { statePatch: { loading: false }, shouldUpdatePreviousSelectedForecastId: false },
        isUnmounted: () => false,
        loadCounterWhenStarted: 1,
        readLoadCounter: () => 2,
        syncPreviousSelectedForecastIdFromProps: jest.fn(),
        applyStatePatch,
      });
      expect(applyStatePatch).not.toHaveBeenCalled();
    });

    it('applies state, zoom, forecast sync, and after hook', () => {
      const applyStatePatch = jest.fn();
      const applyZoomSelection = jest.fn();
      const syncPrevious = jest.fn();
      const afterStatePatch = jest.fn();
      const zoomSelection = { from: new Date('2020-01-01'), to: new Date('2020-01-02') };

      consumeSmvContextLoadResult({
        result: {
          statePatch: { loading: false, hasResults: true },
          zoomSelection,
          shouldUpdatePreviousSelectedForecastId: true,
        },
        isUnmounted: () => false,
        loadCounterWhenStarted: 3,
        readLoadCounter: () => 3,
        syncPreviousSelectedForecastIdFromProps: syncPrevious,
        applyZoomSelection,
        applyStatePatch,
        afterStatePatch,
      });

      expect(syncPrevious).toHaveBeenCalledTimes(1);
      expect(applyZoomSelection).toHaveBeenCalledWith(zoomSelection);
      expect(applyStatePatch).toHaveBeenCalledWith({ loading: false, hasResults: true });
      expect(afterStatePatch).toHaveBeenCalledWith({ loading: false, hasResults: true });
    });
  });
});
