/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar.scss';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  CategoricalColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  PaletteRegistry,
  ColorMapping,
  SPECIAL_TOKENS_STRING_CONVERSION,
} from '@kbn/coloring';
import { ColorPicker } from '@kbn/visualization-ui-components';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiText, EuiBadge } from '@elastic/eui';
import { useState, useCallback } from 'react';
import { getColorCategories } from '@kbn/chart-expressions-common';
import { KbnPalette, KbnPalettes } from '@kbn/palettes';
import { PieVisualizationState } from '../../../common/types';
import { VisualizationDimensionEditorProps } from '../../types';
import {
  PalettePanelContainer,
  PalettePicker,
  getPaletteDisplayColors,
} from '../../shared_components';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import {
  getDefaultColorForMultiMetricDimension,
  hasNonCollapsedSliceBy,
  isCollapsed,
} from './visualization';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';

type DimensionEditorProps = VisualizationDimensionEditorProps<PieVisualizationState> & {
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

  const canUseColorMapping = currentLayer && currentLayer.colorMapping ? true : false;
  const [useNewColorMapping, setUseNewColorMapping] = useState(canUseColorMapping);

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
    (colorMapping?: ColorMapping.Config) => {
      setLocalState({
        ...localState,
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

  const firstNonCollapsedColumnId = currentLayer.primaryGroups.find(
    (id) => !isCollapsed(id, currentLayer)
  );

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

  const colors = getPaletteDisplayColors(
    props.paletteService,
    props.palettes,
    props.isDarkMode,
    props.state.palette,
    currentLayer.colorMapping
  );
  const table = props.frame.activeData?.[currentLayer.layerId];
  const splitCategories = getColorCategories(table?.rows, props.accessor);

  return (
    <>
      {props.accessor === firstNonCollapsedColumnId && (
        <EuiFormRow
          display="columnCompressed"
          label={i18n.translate('xpack.lens.colorMapping.editColorMappingSectionLabel', {
            defaultMessage: 'Color mapping',
          })}
          style={{ alignItems: 'center' }}
          fullWidth
        >
          <PalettePanelContainer
            palette={colors}
            siblingRef={props.panelRef}
            title={
              useNewColorMapping
                ? i18n.translate('xpack.lens.colorMapping.editColorMappingTitle', {
                    defaultMessage: 'Assign colors to terms',
                  })
                : i18n.translate('xpack.lens.colorMapping.editColorsTitle', {
                    defaultMessage: 'Edit colors',
                  })
            }
            isInlineEditing={props.isInlineEditing}
          >
            <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded">
              <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
                <EuiFlexItem>
                  <EuiSwitch
                    label={
                      <EuiText size="xs">
                        <span>
                          {i18n.translate('xpack.lens.colorMapping.tryLabel', {
                            defaultMessage: 'Use the new Color Mapping feature',
                          })}{' '}
                          <EuiBadge color="hollow">
                            {i18n.translate('xpack.lens.colorMapping.techPreviewLabel', {
                              defaultMessage: 'Tech preview',
                            })}
                          </EuiBadge>
                        </span>
                      </EuiText>
                    }
                    data-test-subj="lns_colorMappingOrLegacyPalette_switch"
                    compressed
                    checked={useNewColorMapping}
                    onChange={({ target: { checked } }) => {
                      trackUiCounterEvents(
                        `color_mapping_switch_${checked ? 'enabled' : 'disabled'}`
                      );
                      setColorMapping(checked ? { ...DEFAULT_COLOR_MAPPING_CONFIG } : undefined);
                      setUseNewColorMapping(checked);
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  {canUseColorMapping || useNewColorMapping ? (
                    <CategoricalColorMapping
                      isDarkMode={props.isDarkMode}
                      model={currentLayer.colorMapping ?? { ...DEFAULT_COLOR_MAPPING_CONFIG }}
                      onModelUpdate={(model: ColorMapping.Config) => setColorMapping(model)}
                      palettes={props.palettes}
                      data={{
                        type: 'categories',
                        categories: splitCategories,
                      }}
                      specialTokens={SPECIAL_TOKENS_STRING_CONVERSION}
                    />
                  ) : (
                    <PalettePicker
                      palettes={props.paletteService}
                      activePalette={props.state.palette}
                      setPalette={(newPalette) => {
                        setLocalState({ ...props.state, palette: newPalette });
                      }}
                    />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </PalettePanelContainer>
        </EuiFormRow>
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
            palette: props.state.palette,
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
