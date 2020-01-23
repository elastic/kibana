/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Ast } from '@kbn/interpreter/target/common';
import { getSuggestions } from './metric_suggestions';
import { MetricConfigPanel } from './metric_config_panel';
import { Visualization, FramePublicAPI } from '../types';
import { State, PersistableState } from './types';
import { generateId } from '../id_generator';
import chartMetricSVG from '../assets/chart_metric.svg';

const toExpression = (
  state: State,
  frame: FramePublicAPI,
  mode: 'reduced' | 'full' = 'full'
): Ast => {
  const [datasource] = Object.values(frame.datasourceLayers);
  const operation = datasource && datasource.getOperationForColumnId(state.accessor);

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_metric_chart',
        arguments: {
          title: [(operation && operation.label) || ''],
          accessor: [state.accessor],
          mode: [mode],
        },
      },
    ],
  };
};

export const metricVisualization: Visualization<State, PersistableState> = {
  id: 'lnsMetric',

  visualizationTypes: [
    {
      id: 'lnsMetric',
      icon: 'visMetric',
      largeIcon: chartMetricSVG,
      label: i18n.translate('xpack.lens.metric.label', {
        defaultMessage: 'Metric',
      }),
    },
  ],

  clearLayer(state) {
    return {
      ...state,
      accessor: generateId(),
    };
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription() {
    return {
      icon: chartMetricSVG,
      label: i18n.translate('xpack.lens.metric.label', {
        defaultMessage: 'Metric',
      }),
    };
  },

  getSuggestions,

  initialize(frame, state) {
    return (
      state || {
        layerId: frame.addNewLayer(),
        accessor: generateId(),
      }
    );
  },

  getPersistableState: state => state,

  renderLayerConfigPanel: (domElement, props) =>
    render(
      <I18nProvider>
        <MetricConfigPanel {...props} />
      </I18nProvider>,
      domElement
    ),

  toExpression,
  toPreviewExpression: (state: State, frame: FramePublicAPI) =>
    toExpression(state, frame, 'reduced'),
};
