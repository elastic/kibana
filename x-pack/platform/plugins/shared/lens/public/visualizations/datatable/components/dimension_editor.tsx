/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSwitch,
  EuiButtonGroup,
  EuiSelect,
  EuiFieldNumber,
  EuiColorPicker,
  htmlIdGenerator,
} from '@elastic/eui';
import type { CustomPaletteParams, PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import {
  CUSTOM_PALETTE,
  DEFAULT_COLOR_MAPPING_CONFIG,
  applyPaletteParams,
  canCreateCustomMatch,
  getFallbackDataBounds,
} from '@kbn/coloring';
import { getColorCategories } from '@kbn/chart-expressions-common';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { getOriginalId } from '@kbn/transpose-utils';
import type { KbnPalettes } from '@kbn/palettes';
import type {
  VisualizationDimensionEditorProps,
  DatatableVisualizationState,
} from '@kbn/lens-common';
import { DatatableInspectorTables } from '../../../../common/expressions';

import {
  defaultPaletteParams,
  findMinMaxByColumnId,
  getAccessorType,
} from '../../../shared_components';
import { CollapseSetting } from '../../../shared_components/collapse_setting';
import { ColorMappingByValues } from '../../../shared_components/coloring/color_mapping_by_values';
import { ColorMappingByTerms } from '../../../shared_components/coloring/color_mapping_by_terms';
import { getColumnAlignment } from '../utils';
import type { FormatFactory } from '../../../../common/types';
import { getDatatableColumn } from '../../../../common/expressions/impl/datatable/utils';

const idPrefix = htmlIdGenerator()();
const barColorIdPrefix = htmlIdGenerator()();
const maxValueIdPrefix = htmlIdGenerator()();

type ColumnType = DatatableVisualizationState['columns'][number];

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

  const { isNumeric, isCategory: isBucketable } = getAccessorType(datasource, accessor);
  const showColorByTerms = isBucketable;
  const showDynamicColoringFeature = isBucketable || isNumeric;
  const currentAlignment = getColumnAlignment(column, isNumeric);
  const currentColorMode = column?.colorMode || 'none';
  const showProgressBar = Boolean(column?.showProgressBar);
  /** Effective "cell decoration" for UI: progressBar when showProgressBar, else colorMode (cell → background). */
  const cellDecoration: 'none' | 'background' | 'text' | 'progressBar' = showProgressBar
    ? 'progressBar'
    : currentColorMode === 'cell'
      ? 'background'
      : currentColorMode === 'text'
        ? 'text'
        : 'none';
  const hasDynamicColoring =
    currentColorMode !== 'none' ||
    (showProgressBar &&
      (column?.progressBarColorMode === 'solid' || column?.progressBarColorMode === 'gradient'));
  const visibleColumnsCount = localState.columns.filter((c) => !c.hidden).length;

  const hasTransposedColumn = localState.columns.some(({ isTransposed }) => isTransposed);
  const columnsToCheck = hasTransposedColumn
    ? currentData?.columns.filter(({ id }) => getOriginalId(id) === accessor).map(({ id }) => id) ||
      []
    : [accessor];
  const minMaxByColumnId = findMinMaxByColumnId(columnsToCheck, currentData);
  const currentMinMax = minMaxByColumnId.get(accessor) ?? getFallbackDataBounds();

  const activePalette: PaletteOutput<CustomPaletteParams> = {
    type: 'palette',
    name: showColorByTerms ? 'default' : defaultPaletteParams.name,
    ...column?.palette,
    params: { ...column?.palette?.params },
  };
  // need to tell the helper that the colorStops are required to display
  const displayStops = applyPaletteParams(props.paletteService, activePalette, currentMinMax);

  if (activePalette.name !== CUSTOM_PALETTE && activePalette.params?.stops) {
    activePalette.params.stops = applyPaletteParams(
      props.paletteService,
      activePalette,
      currentMinMax
    );
  }

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
              'data-test-subj': 'lnsDatatable_alignment_groups_center',
              isDisabled: Boolean(column?.showProgressBar),
            },
            {
              id: `${idPrefix}right`,
              label: i18n.translate('xpack.lens.table.alignment.right', {
                defaultMessage: 'Right',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_right',
            },
          ]}
          idSelected={`${idPrefix}${currentAlignment}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as ColumnType['alignment'];
            updateColumnState(accessor, { alignment: newMode });
          }}
        />
      </EuiFormRow>
      {showDynamicColoringFeature && (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.table.cellDecoration.label', {
            defaultMessage: 'Cell decoration',
          })}
        >
          <EuiSelect
            fullWidth
            compressed
            data-test-subj="lnsDatatable_cellDecoration_select"
            options={[
              {
                value: 'none',
                text: i18n.translate('xpack.lens.table.cellDecoration.none', {
                  defaultMessage: 'None',
                }),
              },
              {
                value: 'background',
                text: i18n.translate('xpack.lens.table.cellDecoration.background', {
                  defaultMessage: 'Background',
                }),
              },
              {
                value: 'text',
                text: i18n.translate('xpack.lens.table.cellDecoration.text', {
                  defaultMessage: 'Text',
                }),
              },
              {
                value: 'progressBar',
                text: i18n.translate('xpack.lens.table.cellDecoration.progressBar', {
                  defaultMessage: 'Progress bar',
                }),
              },
            ]}
            value={cellDecoration}
            onChange={(e) => {
              const decoration = e.target.value as typeof cellDecoration;
              const params: Partial<ColumnType> = {};

              if (decoration === 'progressBar') {
                params.showProgressBar = true;
                params.colorMode = 'none';
                const currentBarMode = column?.progressBarColorMode;
                const resolvedBarMode =
                  currentBarMode === 'gradient'
                    ? 'gradient'
                    : currentBarMode === 'solid' || currentBarMode === 'classic'
                      ? 'solid'
                      : 'single';
                params.progressBarColorMode = resolvedBarMode;
                if ((resolvedBarMode === 'solid' || resolvedBarMode === 'gradient') && !column?.palette) {
                  params.palette = {
                    ...activePalette,
                    params: { ...activePalette.params, stops: displayStops },
                  };
                }
                if (showColorByTerms && (resolvedBarMode === 'solid' || resolvedBarMode === 'gradient') && !column?.colorMapping) {
                  params.colorMapping = DEFAULT_COLOR_MAPPING_CONFIG;
                }
              } else {
                params.showProgressBar = false;
                if (decoration === 'none') {
                  params.colorMode = 'none';
                  params.palette = undefined;
                  params.colorMapping = undefined;
                } else if (decoration === 'background') {
                  params.colorMode = 'cell';
                  if (!column?.colorMapping && showColorByTerms) {
                    params.colorMapping = DEFAULT_COLOR_MAPPING_CONFIG;
                  }
                  if (!column?.palette) {
                    params.palette = {
                      ...activePalette,
                      params: { ...activePalette.params, stops: displayStops },
                    };
                  }
                } else {
                  params.colorMode = 'text';
                  if (!column?.colorMapping && showColorByTerms) {
                    params.colorMapping = DEFAULT_COLOR_MAPPING_CONFIG;
                  }
                  if (!column?.palette) {
                    params.palette = {
                      ...activePalette,
                      params: { ...activePalette.params, stops: displayStops },
                    };
                  }
                }
              }
              if (decoration === 'progressBar' && currentAlignment === 'center') {
                params.alignment = 'left';
              }
              props.setState({
                ...localState,
                columns: updateColumn(localState, accessor, params),
              });
            }}
          />
        </EuiFormRow>
      )}
      {!column.isTransposed && props.groupId === 'metrics' && showProgressBar && (
        <>
          <EuiFormRow
            display="columnCompressed"
            fullWidth
            label={i18n.translate('xpack.lens.table.barColor.label', {
              defaultMessage: 'Bar color',
            })}
          >
            <EuiButtonGroup
              isFullWidth
              legend={i18n.translate('xpack.lens.table.barColor.label', {
                defaultMessage: 'Bar color',
              })}
              data-test-subj="lnsDatatable_barColor_groups"
              buttonSize="compressed"
              options={[
                {
                  id: `${barColorIdPrefix}single`,
                  label: i18n.translate('xpack.lens.table.barColor.single', {
                    defaultMessage: 'Single',
                  }),
                  'data-test-subj': 'lnsDatatable_barColor_groups_single',
                },
                {
                  id: `${barColorIdPrefix}solid`,
                  label: i18n.translate('xpack.lens.table.barColor.solid', {
                    defaultMessage: 'Solid',
                  }),
                  'data-test-subj': 'lnsDatatable_barColor_groups_solid',
                },
                {
                  id: `${barColorIdPrefix}gradient`,
                  label: i18n.translate('xpack.lens.table.barColor.gradient', {
                    defaultMessage: 'Gradient',
                  }),
                  'data-test-subj': 'lnsDatatable_barColor_groups_gradient',
                },
              ]}
              idSelected={`${barColorIdPrefix}${column?.progressBarColorMode ?? 'single'}`}
              onChange={(id) => {
                const mode = id.replace(barColorIdPrefix, '') as ColumnType['progressBarColorMode'];
                const updates: Partial<ColumnType> = { progressBarColorMode: mode };
                if (mode === 'solid' || mode === 'gradient') {
                  if (!column?.palette) {
                    updates.palette = {
                      ...activePalette,
                      params: { ...activePalette.params, stops: displayStops },
                    };
                  }
                  if (showColorByTerms && !column?.colorMapping) {
                    updates.colorMapping = DEFAULT_COLOR_MAPPING_CONFIG;
                  }
                }
                props.setState({
                  ...localState,
                  columns: updateColumn(localState, accessor, updates),
                });
              }}
            />
          </EuiFormRow>
          {(column?.progressBarColorMode ?? 'single') === 'single' && (
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={i18n.translate('xpack.lens.table.progressBarColor.label', {
                defaultMessage: 'Progress bar color',
              })}
            >
              <EuiColorPicker
                fullWidth
                compressed
                format="hex"
                color={column?.progressBarColor ?? ''}
                onChange={(color) => {
                  props.setState({
                    ...localState,
                    columns: updateColumn(localState, accessor, {
                      progressBarColor: color || undefined,
                    }),
                  });
                }}
                data-test-subj="lnsDatatable_progressBarColor_picker"
              />
            </EuiFormRow>
          )}
          {(column?.progressBarColorMode === 'solid' || column?.progressBarColorMode === 'gradient') &&
            (showColorByTerms ? (
              <ColorMappingByTerms
                isDarkMode={isDarkMode}
                colorMapping={column.colorMapping}
                palette={activePalette}
                palettes={props.palettes}
                isInlineEditing={isInlineEditing}
                setPalette={(palette) => {
                  updateColumnState(accessor, { palette, colorMapping: undefined });
                }}
                setColorMapping={(colorMapping) => {
                  updateColumnState(accessor, { colorMapping });
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
          <EuiFormRow
            fullWidth
            display="columnCompressed"
            label={i18n.translate('xpack.lens.table.progressBarMaxValue.label', {
              defaultMessage: 'Max value',
            })}
          >
            <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.table.progressBarMaxValue.label', {
              defaultMessage: 'Max value',
            })}
            data-test-subj="lnsDatatable_progressBarMaxValue_groups"
            buttonSize="compressed"
            options={[
              {
                id: `${maxValueIdPrefix}highest`,
                label: i18n.translate('xpack.lens.table.progressBarMaxValue.highest', {
                  defaultMessage: 'Highest',
                }),
                'data-test-subj': 'lnsDatatable_progressBarMaxValue_highest',
              },
              {
                id: `${maxValueIdPrefix}custom`,
                label: i18n.translate('xpack.lens.table.progressBarMaxValue.custom', {
                  defaultMessage: 'Custom',
                }),
                'data-test-subj': 'lnsDatatable_progressBarMaxValue_custom',
              },
            ]}
            idSelected={`${maxValueIdPrefix}${column?.progressBarMaxMode ?? 'highest'}`}
            onChange={(id) => {
              const mode = id.replace(maxValueIdPrefix, '') as ColumnType['progressBarMaxMode'];
              props.setState({
                ...localState,
                columns: updateColumn(localState, accessor, {
                  progressBarMaxMode: mode,
                  ...(mode === 'highest' ? { progressBarMaxValue: undefined } : {}),
                }),
              });
            }}
          />
        </EuiFormRow>
          {showProgressBar && (column?.progressBarMaxMode ?? 'highest') === 'custom' && (
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={i18n.translate('xpack.lens.table.progressBarMaxValue.customValueLabel', {
                defaultMessage: 'Custom max value',
              })}
            >
              <EuiFieldNumber
                fullWidth
                compressed
                data-test-subj="lnsDatatable_progressBarMaxValue_customInput"
                value={
                  column?.progressBarMaxValue !== undefined && column?.progressBarMaxValue !== null
                    ? column.progressBarMaxValue
                    : ''
                }
                onChange={(e) => {
                  const raw = e.currentTarget.value;
                  const num = raw === '' ? undefined : Number(raw);
                  props.setState({
                    ...localState,
                    columns: updateColumn(localState, accessor, {
                      progressBarMaxValue:
                        num !== undefined && !Number.isNaN(num) ? num : undefined,
                    }),
                  });
                }}
                placeholder={i18n.translate('xpack.lens.table.progressBarMaxValue.placeholder', {
                  defaultMessage: 'Enter max value',
                })}
                min={0}
                step={1}
              />
            </EuiFormRow>
          )}
        </>
      )}
      {hasDynamicColoring &&
        !(showProgressBar && (column?.progressBarColorMode === 'solid' || column?.progressBarColorMode === 'gradient')) &&
        (showColorByTerms ? (
          <ColorMappingByTerms
            isDarkMode={isDarkMode}
            colorMapping={column.colorMapping}
            palette={activePalette}
            palettes={props.palettes}
            isInlineEditing={isInlineEditing}
            setPalette={(palette) => {
              updateColumnState(accessor, { palette, colorMapping: undefined });
            }}
            setColorMapping={(colorMapping) => {
              updateColumnState(accessor, { colorMapping });
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
