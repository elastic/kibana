/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiColorPicker } from '@elastic/eui';
import { render } from 'react-dom';
import { Ast } from '@kbn/interpreter';
import { ThemeServiceStart } from '../../../../src/core/public';
import { KibanaThemeProvider } from '../../../../src/plugins/kibana_react/public';
import { Visualization, OperationMetadata } from '../../../plugins/lens/public';
import type { RotatingNumberState } from '../common/types';
import { DEFAULT_COLOR } from '../common/constants';
import { layerTypes } from '../../../plugins/lens/public';

const toExpression = (state: RotatingNumberState): Ast | null => {
  if (!state.accessor) {
    return null;
  }

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'rotating_number',
        arguments: {
          accessor: [state.accessor],
          color: [state?.color || 'black'],
        },
      },
    ],
  };
};
export const getRotatingNumberVisualization = ({
  theme,
}: {
  theme: ThemeServiceStart;
}): Visualization<RotatingNumberState> => ({
  id: 'rotatingNumber',

  visualizationTypes: [
    {
      id: 'rotatingNumber',
      icon: 'refresh',
      label: 'Rotating number',
      groupLabel: 'Goal and single value',
      sortPriority: 3,
    },
  ],

  getVisualizationTypeId() {
    return 'rotatingNumber';
  },

  clearLayer(state) {
    return {
      ...state,
      accessor: undefined,
    };
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription() {
    return {
      icon: 'refresh',
      label: 'A number that rotates',
    };
  },

  getSuggestions: ({ state, table }) => {
    if (!table.columns.length || table.columns.length > 1) {
      return [];
    }
    if (state && table.changeType === 'unchanged') {
      return [];
    }
    const column = table.columns[0];
    if (column.operation.isBucketed || column.operation.dataType !== 'number') {
      return [];
    }
    return [
      {
        previewIcon: 'refresh',
        score: 0.5,
        title: `Rotating ${table.label}` || 'Rotating number',
        state: {
          layerId: table.layerId,
          color: state?.color || DEFAULT_COLOR,
          accessor: column.columnId,
        },
      },
    ];
  },

  initialize(addNewLayer, state) {
    return (
      state || {
        layerId: addNewLayer(),
        accessor: undefined,
        color: DEFAULT_COLOR,
      }
    );
  },

  getConfiguration(props) {
    return {
      groups: [
        {
          groupId: 'metric',
          groupLabel: 'Rotating number',
          layerId: props.state.layerId,
          accessors: props.state.accessor
            ? [
                {
                  columnId: props.state.accessor,
                  triggerIcon: 'color',
                  color: props.state.color,
                },
              ]
            : [],
          supportsMoreColumns: !props.state.accessor,
          filterOperations: (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number',
          enableDimensionEditor: true,
          required: true,
        },
      ],
    };
  },

  getSupportedLayers() {
    return [
      {
        type: layerTypes.DATA,
        label: 'Add visualization layer',
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return layerTypes.DATA;
    }
  },

  toExpression: (state) => toExpression(state),
  toPreviewExpression: (state) => toExpression(state),

  setDimension({ prevState, columnId }) {
    return { ...prevState, accessor: columnId };
  },

  removeDimension({ prevState }) {
    return { ...prevState, accessor: undefined };
  },

  renderDimensionEditor(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <EuiFormRow label="Pick a color">
          <EuiColorPicker
            onChange={(newColor) => {
              props.setState({ ...props.state, color: newColor });
            }}
            color={props.state.color}
          />
        </EuiFormRow>
      </KibanaThemeProvider>,
      domElement
    );
  },

  getErrorMessages(state) {
    // Is it possible to break it?
    return undefined;
  },
});
