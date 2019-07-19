/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Position } from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n/react';
import { getSuggestions } from './xy_suggestions';
import { XYConfigPanel } from './xy_config_panel';
import { Visualization } from '../types';
import { State, PersistableState } from './types';
import { toExpression } from './to_expression';

export const xyVisualization: Visualization<State, PersistableState> = {
  getSuggestions,

  initialize(_, state) {
    return (
      state || {
        // seriesType: 'bar',
        title: 'Empty XY Chart',
        legend: { isVisible: true, position: Position.Right },
        // x: {
        //   accessor: generateId(),
        //   position: Position.Bottom,
        //   showGridlines: false,
        //   title: 'X',
        // },
        // layers: [
        //   {
        //     layerId: 'first',
        //     xAccessor: generateId(),
        //     seriesType: 'bar_stacked',
        //     accessors: [generateId()],
        //     position: Position.Left,
        //     showGridlines: false,
        //     title: 'Y',
        //     labels: [''],
        //     // splitSeriesAccessors: [generateId()],
        //     splitSeriesAccessors: [],
        //   },
        // ],
        layers: [],
      }
    );
  },

  getPersistableState: state => state,

  getLayerIds: state => state.layers.map(({ layerId }) => layerId),

  renderConfigPanel: (domElement, props) =>
    render(
      <I18nProvider>
        <XYConfigPanel {...props} />
      </I18nProvider>,
      domElement
    ),

  toExpression,
};
