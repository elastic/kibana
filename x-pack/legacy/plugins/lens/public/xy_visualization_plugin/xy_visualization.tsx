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
import { generateId } from '../id_generator';

export const xyVisualization: Visualization<State, PersistableState> = {
  getSuggestions,

  initialize(frame, state) {
    return (
      state || {
        title: 'Empty XY Chart',
        legend: { isVisible: true, position: Position.Right },
        layers: [
          {
            layerId: frame.addNewLayer(),
            accessors: [generateId()],
            datasourceId: '',
            labels: [],
            position: Position.Top,
            seriesType: 'bar',
            showGridlines: false,
            splitSeriesAccessors: [generateId()],
            title: '',
            xAccessor: generateId(),
          },
        ],
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
