/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { CellDecorationFillConfig } from '@kbn/lens-common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import {
  getProgressBarDomain,
  getDecorationCustomRange,
  getProgressBarPaletteStops,
  getSolidProgressBarPaletteState,
} from './utils';

describe('datatable progress bar utils', () => {
  describe('getProgressBarDomain', () => {
    const single = (
      overrides: Partial<CellDecorationFillConfig> = {}
    ): CellDecorationFillConfig => ({
      fillMode: 'single',
      ...overrides,
    });

    it('uses the loaded data bounds for an auto range (positive)', () => {
      const domain = getProgressBarDomain(
        { fillStyle: single({ valueRange: { mode: 'auto' } }) },
        { min: 10, max: 90 }
      );
      expect(domain).toEqual({ min: 10, max: 90 });
    });

    it('anchors a flat positive auto range back to zero', () => {
      const domain = getProgressBarDomain(
        { fillStyle: single({ valueRange: { mode: 'auto' } }) },
        { min: 85, max: 85 }
      );
      expect(domain).toEqual({ min: 0, max: 85 });
    });

    it('anchors a flat negative auto range back to zero', () => {
      const domain = getProgressBarDomain(
        { fillStyle: single({ valueRange: { mode: 'auto' } }) },
        { min: -0.2, max: -0.2 }
      );
      expect(domain).toEqual({ min: -0.2, max: 0 });
    });

    it('spans the full mixed-sign auto range', () => {
      const domain = getProgressBarDomain(
        { fillStyle: single({ valueRange: { mode: 'auto' } }) },
        { min: -50, max: 50 }
      );
      expect(domain).toEqual({ min: -50, max: 50 });
    });

    it('honors a single-mode custom range as-is', () => {
      const domain = getProgressBarDomain(
        { fillStyle: single({ valueRange: { mode: 'custom', min: 20, max: 80 } }) },
        { min: 0, max: 100 }
      );
      expect(domain).toEqual({ min: 20, max: 80 });
    });

    it('guards against an all-zero auto domain', () => {
      const domain = getProgressBarDomain(
        { fillStyle: single({ valueRange: { mode: 'auto' } }) },
        { min: 0, max: 0 }
      );
      expect(domain).toEqual({ min: 0, max: 1 });
    });

    it('falls back to data bounds when a custom bound is non-finite', () => {
      const domain = getProgressBarDomain(
        { fillStyle: single({ valueRange: { mode: 'custom', min: NaN, max: 70 } }) },
        { min: 10, max: 50 }
      );
      expect(domain).toEqual({ min: 10, max: 70 });
    });

    it('normalizes an inverted custom range', () => {
      const domain = getProgressBarDomain(
        { fillStyle: single({ valueRange: { mode: 'custom', min: 80, max: 20 } }) },
        { min: 0, max: 100 }
      );
      expect(domain).toEqual({ min: 20, max: 80 });
    });

    it('ignores stale palette range for a single fill', () => {
      const domain = getProgressBarDomain(
        {
          fillStyle: single({ valueRange: { mode: 'auto' } }),
          palette: { params: { rangeMin: -999, rangeMax: 999 } },
        },
        { min: 10, max: 90 }
      );
      // Single mode must not read leftover palette bounds.
      expect(domain).toEqual({ min: 10, max: 90 });
    });

    it('treats open-ended (±Infinity) palette continuities as the data bounds', () => {
      // Default by-value palettes store open-ended continuities as ±Infinity on
      // the palette params; the domain must collapse those to finite data bounds.
      const domain = getProgressBarDomain(
        {
          fillStyle: { fillMode: 'solid', valueRange: { mode: 'custom' } },
          palette: {
            params: { rangeMin: Number.NEGATIVE_INFINITY, rangeMax: Number.POSITIVE_INFINITY },
          },
        },
        { min: -30, max: 27 }
      );
      expect(domain).toEqual({ min: -30, max: 27 });
      expect(Number.isFinite(domain.min)).toBe(true);
      expect(Number.isFinite(domain.max)).toBe(true);
    });

    it('uses data bounds for an explicit Auto palette fill, ignoring stale palette range', () => {
      // Switching Custom -> Auto keeps the last custom bounds on fillStyle (range
      // retention) and may leave stale rangeMin/rangeMax on the palette. An
      // explicit Auto mode must win: the domain follows the loaded data bounds
      // rather than the stale custom palette range.
      const domain = getProgressBarDomain(
        {
          fillStyle: { fillMode: 'gradient', valueRange: { mode: 'auto', min: 0, max: 200 } },
          palette: { params: { rangeMin: 0, rangeMax: 200 } },
        },
        { min: 19, max: 108 }
      );
      expect(domain).toEqual({ min: 19, max: 108 });
    });

    it('drops a positive-only palette fill back to the loaded data bounds when switched to Auto', () => {
      const domain = getProgressBarDomain(
        {
          fillStyle: { fillMode: 'gradient', valueRange: { mode: 'auto', min: -24, max: 108 } },
          palette: { params: { rangeMin: -24, rangeMax: 108 } },
        },
        { min: 19, max: 108 }
      );
      expect(domain).toEqual({ min: 19, max: 108 });
    });

    it('honors a palette range only when fillStyle has no explicit mode (legacy/API)', () => {
      // Backward compatibility: an as-code/legacy column may carry the custom
      // range solely on the palette with no fillStyle.valueRange.mode. That still
      // reads as custom so API-configured ranges keep working.
      const domain = getProgressBarDomain(
        {
          fillStyle: { fillMode: 'solid' },
          palette: { params: { rangeMin: 5, rangeMax: 250 } },
        },
        { min: 19, max: 108 }
      );
      expect(domain).toEqual({ min: 5, max: 250 });
    });
  });

  describe('getProgressBarPaletteStops', () => {
    const paletteService = chartPluginMock.createPaletteRegistry();

    it('converts explicit upper-bound stops into visible lower-bound segments', () => {
      expect(
        getProgressBarPaletteStops(
          paletteService,
          { min: 0, max: 100 },
          { type: 'palette', name: 'custom', params: { rangeType: 'number' } },
          ['#aaa', '#bbb', '#ccc'],
          [20, 50, 80]
        )
      ).toEqual([
        { color: '#aaa', stop: 0 },
        { color: '#bbb', stop: 20 },
        { color: '#ccc', stop: 50 },
      ]);
    });

    it('accepts object-backed stops from the editor palette state', () => {
      expect(
        getProgressBarPaletteStops(
          paletteService,
          { min: 0, max: 100 },
          { type: 'palette', name: 'custom', params: { rangeType: 'number' } },
          ['#aaa', '#bbb', '#ccc'],
          [{ stop: 20 }, { stop: 50 }, { stop: 80 }]
        )
      ).toEqual([
        { color: '#aaa', stop: 0 },
        { color: '#bbb', stop: 20 },
        { color: '#ccc', stop: 50 },
      ]);
    });

    it('maps percent stops across the active progress-bar domain', () => {
      expect(
        getProgressBarPaletteStops(
          paletteService,
          { min: 70, max: 90 },
          { type: 'palette', name: 'custom', params: { rangeType: 'percent' } },
          ['#aaa', '#bbb', '#ccc'],
          [50, 90, 100]
        )
      ).toEqual([
        { color: '#aaa', stop: 70 },
        { color: '#bbb', stop: 80 },
        { color: '#ccc', stop: 88 },
      ]);
    });

    it('extends the last visible color when the whole range sits above the configured stops', () => {
      expect(
        getProgressBarPaletteStops(
          paletteService,
          { min: 100, max: 200 },
          { type: 'palette', name: 'custom', params: { rangeType: 'number' } },
          ['#aaa', '#bbb', '#ccc'],
          [20, 50, 80]
        )
      ).toEqual([{ color: '#ccc', stop: 100 }]);
    });

    it('distributes serialized colors across the domain when stops are empty', () => {
      // Predefined (by-name) palettes serialize their resolved colors but omit
      // numeric stops; the selected colors must drive the bar rather than being
      // discarded in favor of the default palette.
      const stops = getProgressBarPaletteStops(
        paletteService,
        { min: 0, max: 100 },
        undefined,
        ['#111', '#222', '#333', '#444'],
        []
      );
      expect(stops).toEqual([
        { color: '#111', stop: 0 },
        { color: '#222', stop: 25 },
        { color: '#333', stop: 50 },
        { color: '#444', stop: 75 },
      ]);
    });

    it('spreads named palette colors across the selected progress-bar bounds', () => {
      const bounds = { min: 70, max: 90 };
      const palette: PaletteOutput<CustomPaletteParams> = { type: 'palette', name: 'status' };
      const stops = getProgressBarPaletteStops(paletteService, bounds, palette, [], []);
      const expectedStep = (bounds.max - bounds.min) / stops.length;

      expect(stops.length).toBeGreaterThan(0);
      stops.forEach((stop, index) => {
        expect(typeof stop.color).toBe('string');
        expect(stop.color.length).toBeGreaterThan(0);
        expect(stop.stop).toBe(bounds.min + expectedStep * index);
      });
    });
  });

  describe('getSolidProgressBarPaletteState', () => {
    const paletteService = chartPluginMock.createPaletteRegistry();

    it('converts lower-bound meter stops into upper-bound palette stops', () => {
      expect(
        getSolidProgressBarPaletteState(
          paletteService,
          { min: 0, max: 100 },
          {
            type: 'palette',
            name: 'custom',
            params: { continuity: 'above', rangeType: 'number' },
          },
          ['#aaa', '#bbb', '#ccc'],
          [20, 50, 80]
        )
      ).toEqual({
        colors: ['#aaa', '#bbb', '#ccc'],
        gradient: false,
        stops: [20, 50],
        range: 'number',
        rangeMin: 0,
        rangeMax: 100,
        continuity: 'above',
      });
    });

    it('drops the leading domain anchor when colors are distributed evenly across the range', () => {
      expect(
        getSolidProgressBarPaletteState(
          paletteService,
          { min: 0, max: 100 },
          undefined,
          ['#111', '#222', '#333', '#444'],
          []
        )
      ).toEqual({
        colors: ['#111', '#222', '#333', '#444'],
        gradient: false,
        stops: [25, 50, 75],
        range: 'number',
        rangeMin: 0,
        rangeMax: 100,
        continuity: undefined,
      });
    });
  });

  describe('getDecorationCustomRange', () => {
    it('returns auto when there is no fill config', () => {
      expect(getDecorationCustomRange({}, { min: 0, max: 100 })).toEqual({ mode: 'auto' });
    });

    it('falls back to data bounds for single mode without explicit bounds', () => {
      expect(
        getDecorationCustomRange(
          { fillStyle: { fillMode: 'single', valueRange: { mode: 'custom' } } },
          { min: 5, max: 95 }
        )
      ).toEqual({ mode: 'custom', min: 5, max: 95 });
    });

    it('prefers fillStyle valueRange bounds over stale palette bounds for palette fills', () => {
      expect(
        getDecorationCustomRange(
          {
            fillStyle: { fillMode: 'solid', valueRange: { mode: 'custom', min: 10, max: 90 } },
            palette: { params: { rangeMin: 1, rangeMax: 9 } },
          },
          { min: 0, max: 100 }
        )
      ).toEqual({ mode: 'custom', min: 10, max: 90 });
    });

    it('collapses open-ended (±Infinity) palette bounds to finite data bounds', () => {
      // Regression: open-ended palette continuities store ±Infinity, which must
      // not reach the dual-range control (it crashed / rendered NaN inputs).
      const range = getDecorationCustomRange(
        {
          fillStyle: { fillMode: 'solid', valueRange: { mode: 'custom' } },
          palette: {
            params: { rangeMin: Number.NEGATIVE_INFINITY, rangeMax: Number.POSITIVE_INFINITY },
          },
        },
        { min: -30, max: 27 }
      );
      expect(range).toEqual({ mode: 'custom', min: -30, max: 27 });
      if (range.mode !== 'custom') {
        throw new Error('Expected a custom range');
      }
      expect(Number.isFinite(range.min)).toBe(true);
      expect(Number.isFinite(range.max)).toBe(true);
    });
  });
});
