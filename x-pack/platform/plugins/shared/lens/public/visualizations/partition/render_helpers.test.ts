/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/public';

import { checkTableForContainsSmallValues, getLegendStats } from './render_helpers';
import { PieLayerState } from '../../../common/types';
import { PieChartTypes } from '../../../common/constants';
import { LegendValue } from '@elastic/charts';

describe('render helpers', () => {
  describe('#checkTableForContainsSmallValues', () => {
    let datatable: Datatable;
    const columnId = 'foo';

    beforeEach(() => {
      datatable = {
        rows: [],
      } as unknown as Datatable;
    });

    it('should return true if the data contains values less than the target percentage (1)', () => {
      datatable.rows = [
        {
          [columnId]: 80,
        },
        {
          [columnId]: 20,
        },
        {
          [columnId]: 1,
        },
      ];
      expect(checkTableForContainsSmallValues(datatable, columnId, 1)).toBeTruthy();
    });

    it('should return true if the data contains values less than the target percentage (42)', () => {
      datatable.rows = [
        {
          [columnId]: 58,
        },
        {
          [columnId]: 42,
        },
        {
          [columnId]: 1,
        },
      ];
      expect(checkTableForContainsSmallValues(datatable, columnId, 42)).toBeTruthy();
    });

    it('should return false if the data contains values greater than the target percentage', () => {
      datatable.rows = [
        {
          [columnId]: 22,
        },
        {
          [columnId]: 56,
        },
        {
          [columnId]: 12,
        },
      ];
      expect(checkTableForContainsSmallValues(datatable, columnId, 1)).toBeFalsy();
    });
  });

  describe('#getLegendStats', () => {
    it('should firstly read the state value', () => {
      expect(
        getLegendStats({ legendStats: [LegendValue.Value] } as PieLayerState, PieChartTypes.WAFFLE)
      ).toEqual([LegendValue.Value]);

      expect(
        getLegendStats({ legendStats: [] as LegendValue[] } as PieLayerState, PieChartTypes.WAFFLE)
      ).toEqual([]);
    });

    it('should read value from meta in case of value in state is undefined', () => {
      expect(getLegendStats({} as PieLayerState, PieChartTypes.WAFFLE)).toEqual([
        LegendValue.Value,
      ]);

      expect(
        getLegendStats({ legendStats: undefined } as PieLayerState, PieChartTypes.WAFFLE)
      ).toEqual([LegendValue.Value]);

      expect(getLegendStats({} as PieLayerState, PieChartTypes.PIE)).toEqual(undefined);
    });
  });
});
