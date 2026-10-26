/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ast } from '@kbn/interpreter';
import { LegendSize } from '@kbn/chart-expressions-common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { LensPartitionVisualizationState } from '@kbn/lens-common';
import {
  CategoryDisplay,
  LegendDisplay,
  NumberDisplay,
  PieChartTypes,
} from '../../../common/constants';
import { createMockDatasource } from '../../mocks';
import { toExpression } from './to_expression';

const LAYER_ID = 'l1';

const paletteService = chartPluginMock.createPaletteRegistry();

const getState = (
  shape: LensPartitionVisualizationState['shape'],
  legendSize?: LegendSize
): LensPartitionVisualizationState => ({
  shape,
  layers: [
    {
      layerId: LAYER_ID,
      layerType: LayerTypes.DATA,
      primaryGroups: [],
      metrics: ['metric'],
      numberDisplay: NumberDisplay.PERCENT,
      categoryDisplay: CategoryDisplay.DEFAULT,
      legendDisplay: LegendDisplay.DEFAULT,
      legendPosition: 'right',
      truncateLegend: true,
      nestedLegend: false,
      legendSize,
    },
  ],
});

const getLegendSizeArgument = (state: LensPartitionVisualizationState) => {
  const expression = toExpression(
    state,
    { [LAYER_ID]: createMockDatasource(LAYER_ID).publicAPIMock },
    paletteService
  ) as Ast;
  return expression.chain[0].arguments.legendSize;
};

describe('partition toExpression', () => {
  describe('legend size', () => {
    it.each([
      PieChartTypes.PIE,
      PieChartTypes.DONUT,
      PieChartTypes.TREEMAP,
      PieChartTypes.MOSAIC,
      PieChartTypes.WAFFLE,
    ])('defaults to auto for %s when no size is set', (shape) => {
      expect(getLegendSizeArgument(getState(shape))).toEqual([LegendSize.AUTO]);
    });

    it('keeps an explicit size', () => {
      expect(getLegendSizeArgument(getState(PieChartTypes.PIE, LegendSize.MEDIUM))).toEqual([
        LegendSize.MEDIUM,
      ]);
    });
  });
});
