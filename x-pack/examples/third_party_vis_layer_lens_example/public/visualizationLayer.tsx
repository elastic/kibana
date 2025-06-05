/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Ast } from '@kbn/interpreter';
import { ThemeServiceStart } from '@kbn/core/public';
import { XYState } from '@kbn/lens-plugin/public';
import { VisualizationLayer } from '@kbn/lens-plugin/public/types';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, IconType, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { MinimalLayerConfig } from '@kbn/lens-plugin/public/async_services';
import { ColorPicker } from '@kbn/visualization-ui-components';
import { KbnPalette } from '@kbn/palettes';
import type { RotatingNumberState } from '../common/types';

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

export const StaticHeader = ({
  label,
  icon,
  indicator,
}: {
  label: string;
  icon?: IconType;
  indicator?: React.ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={css`
        padding-left: ${euiTheme.size.xs};
      `}
    >
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} />{' '}
        </EuiFlexItem>
      )}
      <EuiFlexItem
        grow
        css={css`
          flex-direction: row;
          align-items: center;
        `}
      >
        <EuiTitle size="xxs">
          <h5>{label}</h5>
        </EuiTitle>
        {indicator}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

type LayerArgs = {
  values: Array<{ id: string; label: string; value: number; color: string; isHidden: boolean }>;
};

const LAYER_TYPE = 'customLayer';

function isStaticLayer(layer: XYState['layers'][number]): layer is MinimalLayerConfig<LayerArgs> {
  return layer.layerType === LAYER_TYPE;
}

/**
 * This is a basic example of the layer API
 * ideally this should not be exposed as is to the consumer, rather be the result
 * of a simplified factory function that will configure most of the scaffolding here be default.
 * The factory should provide the ability to customize all the important stuff, but in a simple (i.e. declarative) way rather than imperative.
 * Also, some user flows should be streamlined here, like the initialDimension + updateDimension thing to avoid confusion.
 * @param param0
 * @returns
 */
export const getXYStaticLayer = ({
  theme,
}: {
  theme: ThemeServiceStart;
}): VisualizationLayer<XYState, XYState, LayerArgs> => ({
  layerType: LAYER_TYPE,
  // metadata methods
  getLayerDescription: (state) => ({
    type: LAYER_TYPE,
    label: 'Custom layer',
    icon: () => <EuiIcon type="anomalyChart" size="m" />,
    noDatasource: true,
    disabled: false,
    initialDimensions: [
      {
        columnId: 'customValue',
        groupId: 'yCustomValue',
        values: [
          { id: 'customValue1', label: 'Default value', value: 0, color: 'green', isHidden: false },
        ],
      },
    ],
  }),
  getUserMessages: () => [],
  getClonedLayer: (layer) => layer,
  getVisualizationInfo: () => ({ layers: [] }),
  // dimension methods
  updateDimension: (props) => {
    const { prevState, layerId } = props;
    const targetLayer = prevState.layers.find((l) => l.layerId === layerId);
    const newLayer: MinimalLayerConfig<LayerArgs> = Object.assign({ values: [] }, targetLayer);
    newLayer.values.push({
      id: 'customValue1',
      label: 'Default value',
      value: 0,
      color: 'green',
      isHidden: false,
    });
    return {
      ...prevState,
      layers: prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l)),
    };
  },
  removeDimension: ({ prevState, layerId, columnId }) => {
    const layer = prevState.layers.find((l) => l.layerId === layerId);
    if (!layer || !isStaticLayer(layer)) {
      return prevState;
    }
    layer.values = layer.values.filter((value) => value.id !== columnId);
    return prevState;
  },
  // layer methods
  onAddLayer: () => ({}),
  // UI components
  getConfiguration: ({ layer }) => ({
    groups: [
      {
        groupId: 'yCustomValue',
        groupLabel: 'Custom values',
        dimensionEditorGroupLabel: 'Value panel',
        accessors:
          layer.values?.map((value) => ({
            columnId: value.id,
            triggerIconType: value.isHidden ? 'invisible' : null ? 'custom' : 'color',
            customIcon: undefined,
            color: value.color,
          })) ?? [],
        dataTestSubj: 'lnsXY_yCustomPanel',
        requiredMinDimensionCount: 0,
        supportsMoreColumns: false,
        supportFieldFormat: false,
        enableDimensionEditor: true,
        filterOperations: () => false,
      },
    ],
  }),
  getDimensionEditorComponent: (props) => {
    if (!isStaticLayer(props.layer)) {
      return null;
    }
    return (
      <ColorPicker
        {...props}
        overwriteColor={props.layer?.values?.[0]?.color}
        defaultColor={'green'}
        setConfig={() => {}}
        disableHelpTooltip
        swatches={props.palettes.get(KbnPalette.Default).colors(10)}
        label={'Color'}
      />
    );
  },
  getDimensionEditorDataExtraComponent: () => <div>getDimensionEditorDataExtraComponent</div>,
  getLayerPanelComponent: () => <div>getLayerPanelComponent</div>,
  getCustomLayerHeader: () => <StaticHeader icon={'anomalyChart'} label="Custom Layer" />,
  getDimensionTriggerComponent: () => <div>getDimensionTriggerComponent</div>,
  // behavioural methods
  onDrop: ({ prevState }) => prevState,
  // how the layer should be persisted? Do not persist in this case
  getPersistableLayer: (state, layer) => undefined,
  isEqualType: (layer) => true,
  // integration apis
  getSupportedActionsForLayer: () => [],
  getDimensionValues: (layer) => layer.values,
  // rendering methods
  toExpression: () => '',
  toPreviewExpression: () => '',
});
