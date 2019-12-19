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
import { XYConfigPanel, LayerContextMenu } from './xy_config_panel';
import { Visualization } from '../types';
import { State, PersistableState, SeriesType, visualizationTypes, LayerConfig } from './types';
import { toExpression, toPreviewExpression } from './to_expression';
import { generateId } from '../id_generator';
import chartBarStackedSVG from '../assets/chart_bar_stacked.svg';
import chartMixedSVG from '../assets/chart_mixed_xy.svg';
import { isHorizontalChart } from './state_helpers';

const defaultIcon = chartBarStackedSVG;
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
    const visualizationType = visualizationTypes.find(v => v.id === state.preferredSeriesType)!;
    return {
      icon: visualizationType.largeIcon || visualizationType.icon,
      label: visualizationType.label,
    };
  }

  const visualizationType = visualizationTypes.find(t => t.id === state.layers[0].seriesType)!;
  const seriesTypes = _.unique(state.layers.map(l => l.seriesType));

  return {
    icon:
      seriesTypes.length === 1
        ? visualizationType.largeIcon || visualizationType.icon
        : chartMixedSVG,
    label:
      seriesTypes.length === 1
        ? visualizationType.label
        : isHorizontalChart(state.layers)
        ? i18n.translate('xpack.lens.xyVisualization.mixedBarHorizontalLabel', {
            defaultMessage: 'Mixed horizontal bar',
          })
        : i18n.translate('xpack.lens.xyVisualization.mixedLabel', {
            defaultMessage: 'Mixed XY',
          }),
  };
}

export const xyVisualization: Visualization<State, PersistableState> = {
  id: 'lnsXY',

  visualizationTypes,

  getLayerIds(state) {
    return state.layers.map(l => l.layerId);
  },

  removeLayer(state, layerId) {
    return {
      ...state,
      layers: state.layers.filter(l => l.layerId !== layerId),
    };
  },

  appendLayer(state, layerId) {
    const usedSeriesTypes = _.uniq(state.layers.map(layer => layer.seriesType));
    return {
      ...state,
      layers: [
        ...state.layers,
        newLayerState(
          usedSeriesTypes.length === 1 ? usedSeriesTypes[0] : state.preferredSeriesType,
          layerId
        ),
      ],
    };
  },

  clearLayer(state, layerId) {
    return {
      ...state,
      layers: state.layers.map(l =>
        l.layerId !== layerId ? l : newLayerState(state.preferredSeriesType, layerId)
      ),
    };
  },

  getDescription(state) {
    const { icon, label } = getDescription(state);
    const chartLabel = i18n.translate('xpack.lens.xyVisualization.chartLabel', {
      defaultMessage: '{label} chart',
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
        title: 'Empty XY chart',
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

  renderLayerConfigPanel: (domElement, props) =>
    render(
      <I18nProvider>
        <XYConfigPanel {...props} />
      </I18nProvider>,
      domElement
    ),

  renderLayerContextMenu(domElement, props) {
    render(
      <I18nProvider>
        <LayerContextMenu {...props} />
      </I18nProvider>,
      domElement
    );
  },

  toExpression,
  toPreviewExpression,
};

function newLayerState(seriesType: SeriesType, layerId: string): LayerConfig {
  return {
    layerId,
    seriesType,
    xAccessor: generateId(),
    accessors: [generateId()],
    splitAccessor: generateId(),
  };
}
