/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { ColorPicker } from '@kbn/visualization-ui-components';

import { EuiButtonGroup, EuiFormRow, htmlIdGenerator } from '@elastic/eui';
import type { PaletteRegistry, ColorMapping, PaletteOutput } from '@kbn/coloring';
import { canCreateCustomMatch } from '@kbn/coloring';
import { getColorCategories } from '@kbn/chart-expressions-common';
import type { ValuesType } from 'utility-types';
import type { KbnPalettes } from '@kbn/palettes';
import { KbnPalette } from '@kbn/palettes';
import type { VisualizationDimensionEditorProps } from '@kbn/lens-common';
import { MULTI_FIELD_KEY_SEPARATOR } from '@kbn/data-plugin/common';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import type { XYState, XYDataLayerConfig, YConfig, YAxisMode } from '../types';
import type { FormatFactory } from '../../../../common/types';
import { getSeriesColor, isHorizontalChart } from '../state_helpers';
import { getDataLayers } from '../visualization_helpers';
import { CollapseSetting } from '../../../shared_components/collapse_setting';
import { getSortedAccessors } from '../to_expression';
import { getColorAssignments, getAssignedColorConfig } from '../color_assignment';
import { ColorMappingByTerms } from '../../../shared_components/coloring/color_mapping_by_terms';

export const idPrefix = htmlIdGenerator()();

function updateLayer(
  state: XYState,
  index: number,
  layer: ValuesType<XYState['layers']>,
  newLayer: Partial<ValuesType<XYState['layers']>>
): XYState['layers'] {
  const newLayers = [...state.layers];
  newLayers[index] = {
    ...layer,
    ...newLayer,
  } as ValuesType<XYState['layers']>;

  return newLayers;
}

export function DataDimensionEditor(
  props: VisualizationDimensionEditorProps<XYState> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
    palettes: KbnPalettes;
    isDarkMode: boolean;
  }
) {
  const { state, layerId, accessor, isDarkMode, isInlineEditing } = props;
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index] as XYDataLayerConfig;

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: props.state,
    onChange: props.setState,
  });

  const updateLayerState = useCallback(
    (layerIndex: number, newLayer: Partial<ValuesType<XYState['layers']>>) => {
      setLocalState({
        ...localState,
        layers: updateLayer(localState, layerIndex, layer, newLayer),
      });
    },
    [layer, setLocalState, localState]
  );

  const localYConfig = layer?.yConfig?.find((yAxisConfig) => yAxisConfig.forAccessor === accessor);
  const axisMode = localYConfig?.axisMode || 'auto';

  const setConfig = useCallback(
    (yConfig: Partial<YConfig> | undefined) => {
      if (yConfig == null) {
        return;
      }
      const newYConfigs = [...(layer.yConfig || [])];
      const existingIndex = newYConfigs.findIndex(
        (yAxisConfig) => yAxisConfig.forAccessor === accessor
      );
      if (existingIndex !== -1) {
        newYConfigs[existingIndex] = { ...newYConfigs[existingIndex], ...yConfig };
      } else {
        newYConfigs.push({
          forAccessor: accessor,
          ...yConfig,
        });
      }
      updateLayerState(index, { yConfig: newYConfigs });
    },
    [layer.yConfig, updateLayerState, index, accessor]
  );

  const setColorMapping = useCallback(
    (colorMapping?: ColorMapping.Config) => {
      updateLayerState(index, { colorMapping });
    },
    [updateLayerState, index]
  );
  const setPalette = useCallback(
    (palette: PaletteOutput) => {
      updateLayerState(index, { palette, colorMapping: undefined });
    },
    [updateLayerState, index]
  );

  const overwriteColor = getSeriesColor(layer, accessor);
  const assignedColor = useMemo(() => {
    const sortedAccessors: string[] = getSortedAccessors(
      props.frame.datasourceLayers[layer.layerId],
      layer
    );
    const colorAssignments = getColorAssignments(
      getDataLayers(state.layers),
      { tables: props.frame.activeData ?? {} },
      props.formatFactory
    );

    return getAssignedColorConfig(
      {
        ...layer,
        accessors: sortedAccessors.filter((sorted) => layer.accessors.includes(sorted)),
      },
      accessor,
      colorAssignments,
      props.frame,

      props.paletteService
    ).color;
  }, [props.frame, props.paletteService, state.layers, accessor, props.formatFactory, layer]);

  if (props.groupId === 'breakdown') {
    const currentData = props.frame.activeData?.[layer.layerId];
    const splitCategories = getColorCategories(currentData?.rows, layer.splitAccessors);

    let formatter: IFieldFormat;
    let allowCustomMatch = false;
    if (layer.splitAccessors && layer.splitAccessors.length > 1) {
      // build the splitAccessor formatter on the fly as combination of each columns formatter
      formatter = props.formatFactory({
        id: 'multi_terms',
        params: {
          paramsPerField: layer.splitAccessors.map((a) => {
            const meta = currentData?.columns?.find(({ id }) => id === a)?.meta;
            return {
              id: meta?.params?.id ?? 'string',
            };
          }),
          separator: MULTI_FIELD_KEY_SEPARATOR,
        },
      });
      allowCustomMatch = false;
    } else {
      const columnMeta = currentData?.columns?.find(({ id }) =>
        layer.splitAccessors?.includes(id)
      )?.meta;
      allowCustomMatch = canCreateCustomMatch(columnMeta);
      formatter = props.formatFactory(columnMeta?.params);
    }

    return !layer.collapseFn ? (
      <div className="lnsIndexPatternDimensionEditor--padded">
        <ColorMappingByTerms
          isDarkMode={isDarkMode}
          colorMapping={layer.colorMapping}
          palette={layer.palette}
          isInlineEditing={isInlineEditing}
          setPalette={setPalette}
          setColorMapping={setColorMapping}
          paletteService={props.paletteService}
          palettes={props.palettes}
          panelRef={props.panelRef}
          categories={splitCategories}
          formatter={formatter}
          allowCustomMatch={allowCustomMatch}
        />
      </div>
    ) : null;
  }

  const isHorizontal = isHorizontalChart(state.layers);
  const disabledMessage = Boolean(!layer.collapseFn && (layer.splitAccessors ?? []).length > 0)
    ? i18n.translate('xpack.lens.xyChart.colorPicker.tooltip.disabled', {
        defaultMessage:
          'You are unable to apply custom colors to individual series when the layer includes a "Break down by" field.',
      })
    : undefined;

  return (
    <div className="lnsIndexPatternDimensionEditor--padded">
      <ColorPicker
        {...props}
        overwriteColor={overwriteColor}
        defaultColor={assignedColor}
        disabledMessage={disabledMessage}
        swatches={props.palettes.get(KbnPalette.Default).colors(10)}
        setConfig={setConfig}
      />

      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.axisSide.label', {
          defaultMessage: 'Axis side',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.xyChart.axisSide.label', {
            defaultMessage: 'Axis side',
          })}
          data-test-subj="lnsXY_axisSide_groups"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}left`,
              label: isHorizontal
                ? i18n.translate('xpack.lens.xyChart.axisSide.bottom', {
                    defaultMessage: 'Bottom',
                  })
                : i18n.translate('xpack.lens.xyChart.axisSide.left', {
                    defaultMessage: 'Left',
                  }),
              'data-test-subj': 'lnsXY_axisSide_groups_left',
            },
            {
              id: `${idPrefix}auto`,
              label: i18n.translate('xpack.lens.xyChart.axisSide.auto', {
                defaultMessage: 'Auto',
              }),
              'data-test-subj': 'lnsXY_axisSide_groups_auto',
            },
            {
              id: `${idPrefix}right`,
              label: isHorizontal
                ? i18n.translate('xpack.lens.xyChart.axisSide.top', {
                    defaultMessage: 'Top',
                  })
                : i18n.translate('xpack.lens.xyChart.axisSide.right', {
                    defaultMessage: 'Right',
                  }),
              'data-test-subj': 'lnsXY_axisSide_groups_right',
            },
          ]}
          idSelected={`${idPrefix}${axisMode}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as YAxisMode;
            setConfig({ axisMode: newMode });
          }}
        />
      </EuiFormRow>
    </div>
  );
}

export function DataDimensionEditorDataSectionExtra(
  props: VisualizationDimensionEditorProps<XYState> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
  }
) {
  const { state, layerId } = props;
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index] as XYDataLayerConfig;

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: props.state,
    onChange: props.setState,
  });

  const updateLayerState = useCallback(
    (layerIndex: number, newLayer: Partial<ValuesType<XYState['layers']>>) => {
      setLocalState({
        ...localState,
        layers: updateLayer(localState, layerIndex, layer, newLayer),
      });
    },
    [layer, setLocalState, localState]
  );

  if (props.groupId === 'breakdown') {
    return (
      <>
        <CollapseSetting
          value={layer.collapseFn || ''}
          onChange={(collapseFn) => {
            updateLayerState(index, { collapseFn });
          }}
        />
      </>
    );
  }

  return null;
}
