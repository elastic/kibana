/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { PaletteRegistry, ColorMapping } from '@kbn/coloring';
import { ColorPicker, FormatFactory } from '@kbn/visualization-ui-components';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { getColorCategories } from '@kbn/chart-expressions-common';
import { KbnPalette, KbnPalettes } from '@kbn/palettes';

import { PieVisualizationState } from '../../../common/types';
import { VisualizationDimensionEditorProps } from '../../types';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import { getDatatableColumn } from '../../../common/expressions/impl/datatable/utils';
import { getSortedAccessorsForGroup } from './to_expression';
import { ColorMappingByTerms } from '../../shared_components/coloring/color_mapping_by_terms';
import {
  getDefaultColorForMultiMetricDimension,
  hasNonCollapsedSliceBy,
  isCollapsed,
} from './visualization';

export type DimensionEditorProps = VisualizationDimensionEditorProps<PieVisualizationState> & {
  formatFactory: FormatFactory;
  paletteService: PaletteRegistry;
  palettes: KbnPalettes;
  isDarkMode: boolean;
};

export function DimensionEditor(props: DimensionEditorProps) {
  const { inputValue: localState, handleInputChange: setLocalState } =
    useDebouncedValue<PieVisualizationState>({
      value: props.state,
      onChange: props.setState,
    });

  const currentLayer = localState.layers.find((layer) => layer.layerId === props.layerId);
  const setConfig = useCallback(
    ({ color }: { color?: string }) => {
      if (!currentLayer) {
        return;
      }
      const newColorsByDimension = { ...currentLayer.colorsByDimension };

      if (color) {
        newColorsByDimension[props.accessor] = color;
      } else {
        delete newColorsByDimension[props.accessor];
      }

      setLocalState({
        ...localState,
        layers: localState.layers.map((layer) =>
          layer.layerId === currentLayer.layerId
            ? {
                ...layer,
                colorsByDimension: newColorsByDimension,
              }
            : layer
        ),
      });
    },
    [currentLayer, localState, props.accessor, setLocalState]
  );

  const setColorMapping = useCallback(
    (colorMapping?: ColorMapping.Config, partialState?: Partial<PieVisualizationState>) => {
      setLocalState({
        ...localState,
        ...partialState,
        layers: localState.layers.map((layer) =>
          layer.layerId === currentLayer?.layerId
            ? {
                ...layer,
                colorMapping,
              }
            : layer
        ),
      });
    },
    [localState, currentLayer, setLocalState]
  );

  if (!currentLayer) {
    return null;
  }

  const originalGroupOrder = getSortedAccessorsForGroup(
    props.datasource,
    currentLayer,
    'primaryGroups'
  );
  const firstNonCollapsedColumnId = originalGroupOrder.find((id) => !isCollapsed(id, currentLayer));

  const showColorPicker =
    currentLayer.metrics.includes(props.accessor) && currentLayer.allowMultipleMetrics;

  const colorPickerDisabledMessage = hasNonCollapsedSliceBy(currentLayer)
    ? ['pie', 'donut'].includes(props.state.shape)
      ? i18n.translate('xpack.lens.pieChart.colorPicker.disabledBecauseSliceBy', {
          defaultMessage:
            'You are unable to apply custom colors to individual slices when the layer includes one or more "Slice by" dimensions.',
        })
      : i18n.translate('xpack.lens.pieChart.colorPicker.disabledBecauseGroupBy', {
          defaultMessage:
            'You are unable to apply custom colors to individual slices when the layer includes one or more "Group by" dimensions.',
        })
    : undefined;

  const currentData = props.frame.activeData?.[currentLayer.layerId];
  const columnMeta = getDatatableColumn(currentData, props.accessor)?.meta;
  const formatter = props.formatFactory(columnMeta?.params);
  const categories = getColorCategories(currentData?.rows, props.accessor);

  return (
    <>
      {props.accessor === firstNonCollapsedColumnId && (
        <ColorMappingByTerms
          isDarkMode={props.isDarkMode}
          panelRef={props.panelRef}
          palettes={props.palettes}
          palette={localState.palette}
          setPalette={(newPalette) => {
            setLocalState({ ...localState, palette: newPalette });
            setColorMapping(undefined, { palette: newPalette });
          }}
          colorMapping={currentLayer.colorMapping}
          setColorMapping={setColorMapping}
          categories={categories}
          paletteService={props.paletteService}
          formatter={formatter}
          isInlineEditing={props.isInlineEditing}
        />
      )}

      {/* TODO: understand how this works  */}
      {showColorPicker && (
        <ColorPicker
          {...props}
          swatches={props.palettes.get(KbnPalette.Default).colors(10)}
          overwriteColor={currentLayer.colorsByDimension?.[props.accessor]}
          defaultColor={getDefaultColorForMultiMetricDimension({
            layer: currentLayer,
            columnId: props.accessor,
            paletteService: props.paletteService,
            datasource: props.datasource,
            palette: localState.palette,
          })}
          disabledMessage={colorPickerDisabledMessage}
          setConfig={setConfig}
        />
      )}
    </>
  );
}

export function DimensionDataExtraEditor(
  props: VisualizationDimensionEditorProps<PieVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const currentLayer = props.state.layers.find((layer) => layer.layerId === props.layerId);

  if (!currentLayer) {
    return null;
  }

  return (
    <>
      {[...currentLayer.primaryGroups, ...(currentLayer.secondaryGroups ?? [])].includes(
        props.accessor
      ) && (
        <CollapseSetting
          value={currentLayer?.collapseFns?.[props.accessor] || ''}
          onChange={(collapseFn) => {
            props.setState({
              ...props.state,
              layers: props.state.layers.map((layer) =>
                layer.layerId !== props.layerId
                  ? layer
                  : {
                      ...layer,
                      collapseFns: {
                        ...layer.collapseFns,
                        [props.accessor]: collapseFn,
                      },
                    }
              ),
            });
          }}
        />
      )}
    </>
  );
}
