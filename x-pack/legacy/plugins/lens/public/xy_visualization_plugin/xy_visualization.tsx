/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { render } from 'react-dom';
import { Position } from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { getSuggestions } from './xy_suggestions';
import { XYConfigPanel } from './xy_config_panel';
import { Visualization } from '../types';
import { State, PersistableState, SeriesType, visualizationTypes } from './types';
import { toExpression, toPreviewExpression } from './to_expression';
import { generateId } from '../id_generator';
import { isHorizontalChart } from './state_helpers';

const defaultIcon = 'visBarVertical';
const defaultSeriesType = 'bar_stacked';

function getDescription(state?: State) {
  if (!state) {
    return {
      icon: defaultIcon,
      label: i18n.translate('xpack.lens.xyVisualization.xyLabel', {
        defaultMessage: 'XY',
      }),
    };
  }

  if (!state.layers.length) {
    return visualizationTypes.find(v => v.id === state.preferredSeriesType)!;
  }

  const visualizationType = visualizationTypes.find(t => t.id === state.layers[0].seriesType)!;
  const seriesTypes = _.unique(state.layers.map(l => l.seriesType));

  return {
    icon: visualizationType.icon,
    label:
      seriesTypes.length === 1
        ? visualizationType.label
        : isHorizontalChart(state.layers)
        ? i18n.translate('xpack.lens.xyVisualization.mixedBarHorizontalLabel', {
            defaultMessage: 'Mixed Horizontal Bar',
          })
        : i18n.translate('xpack.lens.xyVisualization.mixedLabel', {
            defaultMessage: 'Mixed XY',
          }),
  };
}

export const xyVisualization: Visualization<State, PersistableState> = {
  id: 'lnsXY',

  visualizationTypes,

  getDescription(state) {
    const { icon, label } = getDescription(state);
    const chartLabel = i18n.translate('xpack.lens.xyVisualization.chartLabel', {
      defaultMessage: '{label} Chart',
      values: { label },
    });

    return {
      icon: icon || defaultIcon,
      label: chartLabel,
    };
  },

  switchVisualizationType(seriesType: string, state: State) {
    return {
      ...state,
      preferredSeriesType: seriesType as SeriesType,
      layers: state.layers.map(layer => ({ ...layer, seriesType: seriesType as SeriesType })),
    };
  },

  getSuggestions,

  initialize(frame, state) {
    return (
      state || {
        title: 'Empty XY Chart',
        legend: { isVisible: true, position: Position.Right },
        preferredSeriesType: defaultSeriesType,
        layers: [
          {
            layerId: frame.addNewLayer(),
            accessors: [generateId()],
            position: Position.Top,
            seriesType: defaultSeriesType,
            showGridlines: false,
            splitAccessor: generateId(),
            xAccessor: generateId(),
          },
        ],
      }
    );
  },

  getPersistableState: state => state,

  renderConfigPanel: (domElement, props) =>
    render(
      <I18nProvider>
        <XYConfigPanel {...props} />
      </I18nProvider>,
      domElement
    ),

  toExpression,
  toPreviewExpression,
};
