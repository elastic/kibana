/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiSwitch, EuiButtonGroup, EuiComboBox, htmlIdGenerator } from '@elastic/eui';
import type { PaletteRegistry, PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import {
  DEFAULT_COLOR_MAPPING_CONFIG,
  canCreateCustomMatch,
  getFallbackDataBounds,
} from '@kbn/coloring';
import { getColorCategories } from '@kbn/chart-expressions-common';
import { useDebouncedValue } from '@kbn/visualization-utils';
import type { KbnPalettes } from '@kbn/palettes';
import type {
  VisualizationDimensionEditorProps,
  DatatableVisualizationState,
} from '@kbn/lens-common';
import { DatatableInspectorTables } from '../../../../common/expressions';

import { getAccessorType } from '../../../shared_components';
import { CollapseSetting } from '../../../shared_components/collapse_setting';
import { ColorMappingByValues } from '../../../shared_components/coloring/color_mapping_by_values';
import { ColorMappingByTerms } from '../../../shared_components/coloring/color_mapping_by_terms';
import {
  getColumnAlignment,
  getDataBoundsForAccessor,
  getColorByValuePalette,
  getDefaultFillConfig,
} from '../utils';
import { ProgressBarControls } from './progress_bar_controls';
import type { FormatFactory } from '../../../../common/types';
import { getDatatableColumn } from '../../../../common/expressions/impl/datatable/utils';

const idPrefix = htmlIdGenerator()();

type ColumnType = DatatableVisualizationState['columns'][number];

const dynamicColorModeOptions: Array<EuiComboBoxOptionOption<ColumnType['colorMode']>> = [
  {
    id: `${idPrefix}none`,
    value: 'none',
    label: i18n.translate('xpack.lens.table.dynamicColoring.none', {
      defaultMessage: 'None',
    }),
    'data-test-subj': 'lnsDatatable_dynamicColoring_groups_none',
  },
  {
    id: `${idPrefix}cell`,
    value: 'cell',
    label: i18n.translate('xpack.lens.table.dynamicColoring.cell', {
      defaultMessage: 'Background',
    }),
    'data-test-subj': 'lnsDatatable_dynamicColoring_groups_cell',
  },
  {
    id: `${idPrefix}badge`,
    value: 'badge',
    label: i18n.translate('xpack.lens.table.dynamicColoring.badge', {
      defaultMessage: 'Badge',
    }),
    'data-test-subj': 'lnsDatatable_dynamicColoring_groups_badge',
  },
  {
    id: `${idPrefix}text`,
    value: 'text',
    label: i18n.translate('xpack.lens.table.dynamicColoring.text', {
      defaultMessage: 'Text',
    }),
    'data-test-subj': 'lnsDatatable_dynamicColoring_groups_text',
  },
];

const progressBarColorModeOption: EuiComboBoxOptionOption<ColumnType['colorMode']> = {
  id: `${idPrefix}progress`,
  value: 'progress',
  label: i18n.translate('xpack.lens.table.dynamicColoring.progress', {
    defaultMessage: 'Progress bar',
  }),
  'data-test-subj': 'lnsDatatable_dynamicColoring_groups_progress',
};

function updateColumn(
  state: DatatableVisualizationState,
  columnId: string,
  newColumn: Partial<ColumnType>
) {
  return state.columns.map((currentColumn) => {
    if (currentColumn.columnId === columnId) {
      return { ...currentColumn, ...newColumn };
    } else {
      return currentColumn;
    }
  });
}

export type TableDimensionEditorProps =
  VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
    palettes: KbnPalettes;
    isDarkMode: boolean;
    formatFactory: FormatFactory;
  };

export function TableDimensionEditor(props: TableDimensionEditorProps) {
  const { frame, accessor, isInlineEditing, isDarkMode, formatFactory } = props;
  const column = props.state.columns.find(({ columnId }) => accessor === columnId);
  const { inputValue: localState, handleInputChange: setLocalState } =
    useDebouncedValue<DatatableVisualizationState>({
      value: props.state,
      onChange: props.setState,
    });

  const updateColumnState = useCallback(
    (columnId: string, newColumn: Partial<ColumnType>) => {
      setLocalState({
        ...localState,
        columns: updateColumn(localState, columnId, newColumn),
      });
    },
    [setLocalState, localState]
  );

  if (!column) return null;
  if (column.isTransposed) return null;

  const currentData =
    frame.activeData?.[localState.layerId] ?? frame.activeData?.[DatatableInspectorTables.Default];
  const columnMeta = getDatatableColumn(currentData, accessor)?.meta;
  const formatter = formatFactory(columnMeta?.params);
  const allowCustomMatch = canCreateCustomMatch(columnMeta);
  const datasource = frame.datasourceLayers?.[localState.layerId];

  const { isNumeric, isCategory: isBucketable } = getAccessorType(
    datasource,
    accessor,
    columnMeta?.type
  );
  const showColorByTerms = isBucketable;
  const showDynamicColoringFeature = isBucketable || isNumeric;
  const currentColorMode = column?.colorMode || 'none';
  const hasDynamicColoring = currentColorMode !== 'none';
  const isProgressMode = currentColorMode === 'progress';
  // "Progress bar" is a numeric-only decoration; "Center" alignment is unsupported for it.
  const disableCenterAlignment = isProgressMode;
  const currentAlignment = getColumnAlignment(column, isNumeric);
  const effectiveAlignment =
    disableCenterAlignment && currentAlignment === 'center' ? 'right' : currentAlignment;
  const visibleColumnsCount = localState.columns.filter((c) => !c.hidden).length;

  // Progress bar is offered only for numeric columns (not terms-colored buckets).
  const colorModeOptions =
    isNumeric && !showColorByTerms
      ? [...dynamicColorModeOptions, progressBarColorModeOption]
      : dynamicColorModeOptions;

  const selectedDynamicColorModeOption =
    colorModeOptions.find((option) => option.value === currentColorMode) ?? colorModeOptions[0];

  const currentMinMax =
    getDataBoundsForAccessor(accessor, currentData, localState.columns) ?? getFallbackDataBounds();

  let activePalette: PaletteOutput<CustomPaletteParams>;

  if (showColorByTerms) {
    // Terms coloring uses the existing palette or the 'default' categorical palette
    activePalette = {
      type: 'palette',
      name: column?.palette?.name ?? 'default',
    };
  } else {
    // Value coloring uses the existing palette or the 'positive' color by value palette
    activePalette = getColorByValuePalette(props.paletteService, currentMinMax, column?.palette);
  }

  // Check if a legacy palette is used for terms coloring instead of a color mapping
  const isLegacyTermsMode =
    showColorByTerms &&
    !column.colorMapping &&
    Boolean(column.palette) &&
    !column.palette?.params?.stops?.length;

  return (
    <div className="lnsIndexPatternDimensionEditor--padded">
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.table.alignment.label', {
          defaultMessage: 'Text alignment',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.table.alignment.label', {
            defaultMessage: 'Text alignment',
          })}
          data-test-subj="lnsDatatable_alignment_groups"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}left`,
              label: i18n.translate('xpack.lens.table.alignment.left', {
                defaultMessage: 'Left',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_left',
            },
            {
              id: `${idPrefix}center`,
              label: i18n.translate('xpack.lens.table.alignment.center', {
                defaultMessage: 'Center',
              }),
              isDisabled: disableCenterAlignment,
              toolTipContent: disableCenterAlignment
                ? i18n.translate('xpack.lens.table.alignment.center.progressDisabledTooltip', {
                    defaultMessage: `Center alignment isn't supported with progress bars.`,
                  })
                : undefined,
              'data-test-subj': 'lnsDatatable_alignment_groups_center',
            },
            {
              id: `${idPrefix}right`,
              label: i18n.translate('xpack.lens.table.alignment.right', {
                defaultMessage: 'Right',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_right',
            },
          ]}
          idSelected={`${idPrefix}${effectiveAlignment}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as ColumnType['alignment'];
            updateColumnState(accessor, { alignment: newMode });
          }}
        />
      </EuiFormRow>
      {showDynamicColoringFeature && (
        <>
          <EuiFormRow
            display="columnCompressed"
            fullWidth
            label={i18n.translate('xpack.lens.table.dynamicColoring.label', {
              defaultMessage: 'Cell decoration',
            })}
          >
            <EuiComboBox
              fullWidth
              compressed
              isClearable={false}
              aria-label={i18n.translate('xpack.lens.table.dynamicColoring.label', {
                defaultMessage: 'Cell decoration',
              })}
              data-test-subj="lnsDatatable_dynamicColoring_groups"
              singleSelection={{ asPlainText: true }}
              options={colorModeOptions}
              selectedOptions={[selectedDynamicColorModeOption]}
              onChange={(choices) => {
                const newMode = choices[0]?.value;
                if (!newMode) {
                  return;
                }
                const params: Partial<ColumnType> = {
                  colorMode: newMode,
                };

                if (newMode !== 'none') {
                  if (showColorByTerms) {
                    if (!column?.colorMapping) {
                      params.colorMapping = DEFAULT_COLOR_MAPPING_CONFIG;
                    }
                  } else {
                    if (!column?.palette) {
                      params.palette = activePalette;
                    }
                  }
                }

                if (newMode === 'progress') {
                  // Seed the fill config (new layers only) and force a non-center
                  // alignment for legibility. Persisted configs are left untouched.
                  if (!column?.fillStyle) {
                    params.fillStyle = getDefaultFillConfig(newMode);
                  }
                  if (currentAlignment === 'center') {
                    params.alignment = 'right';
                  }
                } else if (currentColorMode === 'progress') {
                  // Leaving progress mode: drop progress-only configuration.
                  params.fillStyle = undefined;
                }

                // clear up when switching to no coloring
                if (newMode === 'none') {
                  params.palette = undefined;
                  params.colorMapping = undefined;
                }
                updateColumnState(accessor, params);
              }}
            />
          </EuiFormRow>

          {hasDynamicColoring &&
            (isProgressMode ? (
              <ProgressBarControls
                column={column}
                fillStyle={column.fillStyle ?? getDefaultFillConfig('progress')}
                dataBounds={currentMinMax}
                palette={activePalette}
                paletteService={props.paletteService}
                panelRef={props.panelRef}
                isInlineEditing={isInlineEditing}
                formatter={formatter}
                onUpdate={(newColumn) => updateColumnState(accessor, newColumn)}
              />
            ) : showColorByTerms ? (
              <ColorMappingByTerms
                isDarkMode={isDarkMode}
                colorMapping={
                  isLegacyTermsMode
                    ? undefined
                    : column.colorMapping ?? DEFAULT_COLOR_MAPPING_CONFIG
                }
                palette={isLegacyTermsMode ? activePalette : undefined}
                palettes={props.palettes}
                isInlineEditing={isInlineEditing}
                setPalette={(palette) => {
                  updateColumnState(accessor, { palette, colorMapping: undefined });
                }}
                setColorMapping={(colorMapping) => {
                  updateColumnState(accessor, {
                    colorMapping,
                    ...(colorMapping != null ? { palette: undefined } : {}),
                  });
                }}
                paletteService={props.paletteService}
                panelRef={props.panelRef}
                categories={getColorCategories(currentData?.rows, [accessor], [null])}
                formatter={formatter}
                allowCustomMatch={allowCustomMatch}
              />
            ) : (
              <ColorMappingByValues
                palette={activePalette}
                isInlineEditing={isInlineEditing}
                setPalette={(newPalette) => {
                  updateColumnState(accessor, { palette: newPalette });
                }}
                paletteService={props.paletteService}
                panelRef={props.panelRef}
                dataBounds={currentMinMax}
              />
            ))}
        </>
      )}
      {!column.isTransposed && (
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
            defaultMessage: 'Hide column',
          })}
          display="columnCompressed"
        >
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
              defaultMessage: 'Hide column',
            })}
            showLabel={false}
            data-test-subj="lns-table-column-hidden"
            checked={Boolean(column?.hidden)}
            disabled={!column.hidden && visibleColumnsCount <= 1}
            onChange={() => {
              const newState = {
                ...localState,
                columns: localState.columns.map((currentColumn) => {
                  if (currentColumn.columnId === accessor) {
                    return {
                      ...currentColumn,
                      hidden: !column.hidden,
                    };
                  } else {
                    return currentColumn;
                  }
                }),
              };
              setLocalState(newState);
            }}
          />
        </EuiFormRow>
      )}
      {props.groupId === 'rows' && (
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.lens.table.columnFilterClickLabel', {
            defaultMessage: 'Directly filter on click',
          })}
          display="columnCompressed"
        >
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.lens.table.columnFilterClickLabel', {
              defaultMessage: 'Directly filter on click',
            })}
            showLabel={false}
            data-test-subj="lns-table-column-one-click-filter"
            checked={Boolean(column?.oneClickFilter)}
            disabled={column.hidden}
            onChange={() => {
              const newState = {
                ...localState,
                columns: localState.columns.map((currentColumn) => {
                  if (currentColumn.columnId === accessor) {
                    return {
                      ...currentColumn,
                      oneClickFilter: !column.oneClickFilter,
                    };
                  } else {
                    return currentColumn;
                  }
                }),
              };
              setLocalState(newState);
            }}
          />
        </EuiFormRow>
      )}
    </div>
  );
}

export function TableDimensionDataExtraEditor(
  props: VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, accessor } = props;
  const column = state.columns.find(({ columnId }) => accessor === columnId);

  if (!column) return null;
  if (column.isTransposed) return null;

  return (
    <>
      {props.groupId === 'rows' && (
        <CollapseSetting
          value={column.collapseFn || ''}
          onChange={(collapseFn) => {
            setState({
              ...state,
              columns: updateColumn(state, accessor, { collapseFn }),
            });
          }}
        />
      )}
    </>
  );
}
