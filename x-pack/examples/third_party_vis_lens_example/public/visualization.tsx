/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiColorPicker } from '@elastic/eui';
import { Ast } from '@kbn/interpreter';
import { ThemeServiceStart } from '@kbn/core/public';
import { Visualization, OperationMetadata } from '@kbn/lens-plugin/public';
import { layerTypes } from '@kbn/lens-plugin/public';
import type { RotatingNumberState } from '../common/types';
import { DEFAULT_COLOR } from '../common/constants';

const toExpression = (
  state: RotatingNumberState,
  datasourceExpressionsByLayers?: Record<string, Ast>
): Ast | null => {
  if (!state.accessor) {
    return null;
  }

  return {
    type: 'expression',
    chain: [
      ...Object.values(datasourceExpressionsByLayers || {})[0].chain,
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

  getVisualizationTypeId() {
    return 'rotatingNumber';
  },
  visualizationTypes: [
    {
      id: 'rotatingNumber',
      icon: 'refresh',
      label: 'Rotating number',
      description: 'A number that rotates',
      sortPriority: 3,
    },
  ],

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
        title: table.label ? `Rotating ${table.label}` : 'Rotating number',
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

  toExpression: (state, _layers, _attributes, datasourceExpression) =>
    toExpression(state, datasourceExpression),
  toPreviewExpression: (state, _layers, datasourceExpression) =>
    toExpression(state, datasourceExpression),

  setDimension({ prevState, columnId }) {
    return { ...prevState, accessor: columnId };
  },

  removeDimension({ prevState }) {
    return { ...prevState, accessor: undefined };
  },

  DimensionEditorComponent(props) {
    return (
      <EuiFormRow label="Pick a color">
        <EuiColorPicker
          onChange={(newColor) => {
            props.setState({ ...props.state, color: newColor });
          }}
          color={props.state.color}
        />
      </EuiFormRow>
    );
  },
});
