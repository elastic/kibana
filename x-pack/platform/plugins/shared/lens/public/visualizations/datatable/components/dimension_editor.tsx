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
import {
  COLUMN_CELL_DECORATION_MODE,
  type ColumnCellDecorationMode,
  type VisualizationDimensionEditorProps,
  type DatatableVisualizationState,
} from '@kbn/lens-common';
import { DatatableInspectorTables } from '../../../../common/expressions';

import { getAccessorType } from '../../../shared_components';
import { CollapseSetting } from '../../../shared_components/collapse_setting';
import { ColorMappingByValues } from '../../../shared_components/coloring/color_mapping_by_values';
import { ColorMappingByTerms } from '../../../shared_components/coloring/color_mapping_by_terms';
import {
  getColumnAlignment,
  getSupportedColumnAlignment,
  getDataBoundsForAccessor,
  getColorByValuePalette,
  getDefaultProgressPalette,
  getDefaultFillConfig,
  isPaletteFillMode,
} from '../utils';
import {
  CELL_DECORATION_CAPABILITIES,
  getAlignmentLabel,
  getCellDecorationCapabilities,
  getCellDecorationLabel,
  getUnsupportedAlignmentReason,
  isAlignmentSupported,
  type CellAlignment,
  type ColumnKind,
} from '../cell_decoration';
import { ProgressBarControls } from './progress_bar_controls';
import type { FormatFactory } from '../../../../common/types';
import { getDatatableColumn } from '../../../../common/expressions/impl/datatable/utils';

const idPrefix = htmlIdGenerator()();

type ColumnType = DatatableVisualizationState['columns'][number];

/** Decoration modes in editor display order. */
const COLOR_MODE_ORDER: readonly ColumnCellDecorationMode[] = [
  COLUMN_CELL_DECORATION_MODE.NONE,
  COLUMN_CELL_DECORATION_MODE.CELL,
  COLUMN_CELL_DECORATION_MODE.BADGE,
  COLUMN_CELL_DECORATION_MODE.TEXT,
  COLUMN_CELL_DECORATION_MODE.PROGRESS,
];

/**
 * Builds the "Cell decoration" picker options for a column, gated by the
 * column's kind. Each option's label/test id come from the capability registry,
 * so copy and availability stay in one place.
 */
function getColorModeOptions(
  columnKind: ColumnKind | undefined
): Array<EuiComboBoxOptionOption<ColumnType['colorMode']>> {
  return COLOR_MODE_ORDER.filter((mode) => {
    const { supportedColumnKinds } = CELL_DECORATION_CAPABILITIES[mode];
    if (supportedColumnKinds.length === 0) return true; // e.g. `none`
    return columnKind != null && supportedColumnKinds.includes(columnKind);
  }).map((mode) => ({
    id: `${idPrefix}${mode}`,
    value: mode,
    label: getCellDecorationLabel(mode),
    'data-test-subj': `lnsDatatable_dynamicColoring_groups_${mode}`,
  }));
}

/** Text alignment controls in editor display order, labels sourced from the registry. */
const ALIGNMENT_OPTIONS: ReadonlyArray<{ alignment: CellAlignment; label: string }> = (
  ['left', 'center', 'right'] as const
).map((alignment) => ({ alignment, label: getAlignmentLabel(alignment) }));

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
  const flushState = useCallback(
    (nextState: DatatableVisualizationState) => {
      props.setState(nextState);
    },
    [props]
  );
  const { inputValue: localState, handleInputChange: setLocalState } =
    useDebouncedValue<DatatableVisualizationState>({
      value: props.state,
      onChange: flushState,
    });
  const column = localState.columns.find(({ columnId }) => accessor === columnId);

  const updateColumnState = useCallback(
    (
      columnId: string,
      newColumn: Partial<ColumnType>,
      options: {
        flush?: boolean;
      } = {}
    ) => {
      const nextState = {
        ...localState,
        columns: updateColumn(localState, columnId, newColumn),
      };

      setLocalState(nextState);

      if (options.flush) {
        flushState(nextState);
      }
    },
    [setLocalState, localState, flushState]
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
  const currentColorMode = column?.colorMode || COLUMN_CELL_DECORATION_MODE.NONE;
  const hasDynamicColoring = currentColorMode !== COLUMN_CELL_DECORATION_MODE.NONE;
  const isProgressMode = currentColorMode === COLUMN_CELL_DECORATION_MODE.PROGRESS;

  // A terms-colored bucket is treated as bucketed; everything else offered here is numeric.
  const columnKind: ColumnKind = showColorByTerms ? 'bucketed' : 'numeric';
  const currentAlignment = getColumnAlignment(column, isNumeric);
  const effectiveAlignment = getSupportedColumnAlignment(column, isNumeric);
  const visibleColumnsCount = localState.columns.filter((c) => !c.hidden).length;

  const colorModeOptions = getColorModeOptions(showDynamicColoringFeature ? columnKind : undefined);

  const selectedDynamicColorModeOption =
    colorModeOptions.find((option) => option.value === currentColorMode) ?? colorModeOptions[0];

  const currentMinMax =
    getDataBoundsForAccessor(accessor, currentData, localState.columns) ?? getFallbackDataBounds();
  const progressBarAppendLabel =
    columnMeta?.params?.id && typeof formatter.type.title === 'string'
      ? formatter.type.title
      : undefined;

  let activePalette: PaletteOutput<CustomPaletteParams>;
  const shouldUseDefaultProgressPalette =
    currentColorMode === COLUMN_CELL_DECORATION_MODE.PROGRESS &&
    column?.fillStyle != null &&
    isPaletteFillMode(column.fillStyle.fillMode) &&
    !column.palette;

  if (showColorByTerms) {
    // Terms coloring uses the existing palette or the 'default' categorical palette
    activePalette = {
      type: 'palette',
      name: column?.palette?.name ?? 'default',
    };
  } else {
    // Progress bars with a palette fill but no persisted palette should show the
    // same default palette the renderer uses, instead of the generic numeric fallback.
    activePalette = shouldUseDefaultProgressPalette
      ? getDefaultProgressPalette()
      : getColorByValuePalette(props.paletteService, currentMinMax, column?.palette);
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
          options={ALIGNMENT_OPTIONS.map(({ alignment, label }) => {
            const unsupportedReason = getUnsupportedAlignmentReason(currentColorMode, alignment);
            return {
              id: `${idPrefix}${alignment}`,
              label,
              isDisabled: Boolean(unsupportedReason),
              toolTipContent: unsupportedReason,
              'data-test-subj': `lnsDatatable_alignment_groups_${alignment}`,
            };
          })}
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

                if (newMode !== COLUMN_CELL_DECORATION_MODE.NONE) {
                  if (showColorByTerms) {
                    if (!column?.colorMapping) {
                      params.colorMapping = DEFAULT_COLOR_MAPPING_CONFIG;
                    }
                  } else {
                    if (!column?.palette) {
                      params.palette =
                        newMode === COLUMN_CELL_DECORATION_MODE.PROGRESS
                          ? getDefaultProgressPalette()
                          : activePalette;
                    }
                  }
                }

                const nextDecoration = getCellDecorationCapabilities(newMode);

                if (newMode === COLUMN_CELL_DECORATION_MODE.PROGRESS) {
                  // Seed the fill config for new layers only; persisted configs
                  // are left untouched.
                  if (!column?.fillStyle) {
                    params.fillStyle = getDefaultFillConfig(newMode);
                  }
                } else if (currentColorMode === COLUMN_CELL_DECORATION_MODE.PROGRESS) {
                  // Leaving progress mode: drop progress-only configuration.
                  params.fillStyle = undefined;
                }

                // Coerce to the decoration's preferred alignment when the current
                // one is unsupported (e.g. center under a progress bar).
                if (
                  !isAlignmentSupported(newMode, currentAlignment) &&
                  nextDecoration.defaultAlignment
                ) {
                  params.alignment = nextDecoration.defaultAlignment;
                }

                // clear up when switching to no coloring
                if (newMode === COLUMN_CELL_DECORATION_MODE.NONE) {
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
                fillStyle={
                  column.fillStyle ?? getDefaultFillConfig(COLUMN_CELL_DECORATION_MODE.PROGRESS)
                }
                dataBounds={currentMinMax}
                palette={activePalette}
                paletteService={props.paletteService}
                panelRef={props.panelRef}
                appendLabel={progressBarAppendLabel}
                isInlineEditing={isInlineEditing}
                onUpdate={(newColumn) => updateColumnState(accessor, newColumn, { flush: true })}
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
            onChange={() => updateColumnState(accessor, { hidden: !column.hidden })}
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
            onChange={() => updateColumnState(accessor, { oneClickFilter: !column.oneClickFilter })}
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
