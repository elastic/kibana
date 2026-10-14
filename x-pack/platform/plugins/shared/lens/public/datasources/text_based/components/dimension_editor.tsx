/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSpacer,
  useEuiTheme,
  EuiText,
  EuiSwitch,
  EuiFieldNumber,
} from '@elastic/eui';
import { type ExpressionsStart } from '@kbn/expressions-plugin/public';
import { NameInput } from '@kbn/visualization-ui-components';
import { css } from '@emotion/react';
import type {
  TextBasedPrivateState,
  TextBasedLayer,
  DatasourceDimensionEditorProps,
  DataType,
} from '@kbn/lens-common';
import {
  mergeLayer,
  updateColumnFormat,
  updateColumnLabel,
  isNotNumeric,
  isNumeric,
  updateColumnDropPartials,
} from '../utils';
import type { FormatSelectorProps } from '../../form_based/dimension_panel/format_selector';
import { FormatSelector } from '../../form_based/dimension_panel/format_selector';
import { DimensionEditorButtonGroups } from '../../form_based/dimension_panel/dimensions_editor_helpers';
import { FieldSelect, type FieldOptionCompatible } from './field_select';
import { fetchFieldsFromESQLExpression } from './fetch_fields_from_esql_expression';

export type TextBasedDimensionEditorProps =
  DatasourceDimensionEditorProps<TextBasedPrivateState> & {
    expressions: ExpressionsStart;
  };

export function TextBasedDimensionEditor(props: TextBasedDimensionEditorProps) {
  const [allColumns, setAllColumns] = useState<FieldOptionCompatible[]>([]);
  const [columnsQuery, setColumnsQuery] = useState<string>();
  const query = props.state.layers[props.layerId]?.query;
  const { euiTheme } = useEuiTheme();
  const {
    isFullscreen,
    columnId,
    layerId,
    state,
    setState,
    indexPatterns,
    dateRange,
    expressions,
    esqlVariables,
    isApproximate,
    enableFormatSelector,
    isMetricDimension,
    filterOperations,
    supportStaticValue,
  } = props;

  // Extract the primitives the fetch effect actually depends on so that a
  // rebuilt but structurally-equal `query` or `indexPatterns` object from the
  // parent does not retrigger the ES|QL round trip.
  const queryEsql = query?.esql;
  const timeFieldName = useMemo(() => {
    const values = Object.values(indexPatterns);
    return values.length ? values[0].timeFieldName : undefined;
  }, [indexPatterns]);

  useEffect(() => {
    // in case the columns are not in the cache, I refetch them
    if (!queryEsql) return;

    // Cancel the in-flight request when the inputs change or the editor unmounts so
    // a slower, stale response cannot overwrite the columns of a newer query.
    const controller = new AbortController();
    let cancelled = false;

    async function fetchColumns() {
      try {
        const table = await fetchFieldsFromESQLExpression(
          { esql: `${queryEsql} | limit 0` },
          expressions,
          { from: dateRange.fromDate, to: dateRange.toDate },
          controller,
          timeFieldName,
          esqlVariables,
          isApproximate
        );

        if (cancelled || !table) return;

        const hasNumberTypeColumns = table.columns?.some(isNumeric);
        const columns = table.columns.map((col) => {
          return {
            id: col.variable ?? col.id,
            name: col.variable ? `??${col.variable}` : col.name,
            meta: col?.meta ?? { type: 'number' },
            variable: col.variable,
            compatible:
              supportStaticValue || (isMetricDimension && hasNumberTypeColumns)
                ? filterOperations({
                    dataType: col?.meta?.type as DataType,
                    isBucketed: Boolean(isNotNumeric(col)),
                    scale: 'ordinal',
                  })
                : true,
          };
        });
        setAllColumns(columns);
        setColumnsQuery(queryEsql);
      } catch (err) {
        // Only swallow the abort we caused via cleanup; let real fetch /
        // ES|QL errors propagate as an unhandled promise rejection, matching
        // the pre-fix behavior where they surfaced in the browser console.
        if (!cancelled) {
          throw err;
        }
      }
    }
    fetchColumns();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    dateRange.fromDate,
    dateRange.toDate,
    esqlVariables,
    isApproximate,
    expressions,
    queryEsql,
    timeFieldName,
    isMetricDimension,
    filterOperations,
    supportStaticValue,
  ]);

  const selectedField = useMemo(() => {
    const layerColumns = props.state.layers[props.layerId].columns;
    return layerColumns?.find((column) => column.columnId === props.columnId);
  }, [props.columnId, props.layerId, props.state.layers]);

  const updateLayer = useCallback(
    (newLayer: Partial<TextBasedLayer>) =>
      setState((prevState) => mergeLayer({ state: prevState, layerId, newLayer })),
    [layerId, setState]
  );

  const onFormatChange = useCallback<FormatSelectorProps['onChange']>(
    (newFormat) => {
      updateLayer(
        updateColumnFormat({
          layer: state.layers[layerId],
          columnId,
          value: newFormat,
        })
      );
    },
    [columnId, layerId, state.layers, updateLayer]
  );

  const onDropPartialsChange = useCallback(
    (value: boolean) => {
      updateLayer(
        updateColumnDropPartials({
          layer: state.layers[layerId],
          columnId,
          value,
        })
      );
    },
    [columnId, layerId, state.layers, updateLayer]
  );

  const isStatic = Boolean(
    supportStaticValue && (!selectedField || selectedField.valueSource?.type === 'static')
  );

  useEffect(() => {
    if (
      !supportStaticValue ||
      columnsQuery !== queryEsql ||
      selectedField?.valueSource?.type !== 'unconfigured'
    )
      return;
    const numericColumns = allColumns.filter(
      (column) => column.compatible && column.meta?.type === 'number'
    );
    if (numericColumns.length !== 1) return;
    const [field] = numericColumns;
    setState((previousState) => {
      const layer = previousState.layers[layerId];
      return mergeLayer({
        state: previousState,
        layerId,
        newLayer: {
          ...layer,
          columns: layer.columns.map((column) =>
            column.columnId === columnId && column.valueSource?.type === 'unconfigured'
              ? {
                  ...column,
                  fieldName: field.name,
                  label: column.customLabel ? column.label : field.name,
                  meta: field.meta,
                  variable: field.variable,
                  valueSource: { type: 'query' as const },
                }
              : column
          ),
        },
      });
    });
  }, [
    allColumns,
    columnId,
    columnsQuery,
    layerId,
    queryEsql,
    selectedField?.valueSource?.type,
    setState,
    supportStaticValue,
  ]);
  const setStaticValue = (value: number) => {
    if (!Number.isFinite(value)) return;
    setState((previousState) => {
      const layer = previousState.layers[layerId];
      const previousColumn = layer.columns.find((column) => column.columnId === columnId);
      const column = {
        ...previousColumn,
        columnId,
        fieldName: String(value),
        label: previousColumn?.customLabel ? previousColumn.label : String(value),
        variable: undefined,
        valueSource: { type: 'static' as const, value },
        meta: { type: 'number' as const },
      };
      return mergeLayer({
        state: previousState,
        layerId,
        newLayer: {
          ...layer,
          columns: previousColumn
            ? layer.columns.map((existing) => (existing.columnId === columnId ? column : existing))
            : [...layer.columns, column],
        },
      });
    });
  };
  const activeTable = props.activeData?.[layerId];
  const activeColumnMeta = activeTable?.columns.find((col) => col.id === columnId)?.meta;
  const isNumericColumn =
    activeColumnMeta != null
      ? activeColumnMeta?.type === 'number'
      : selectedField?.meta?.type === 'number';

  const isDateHistogramColumn =
    activeColumnMeta?.esType === 'date' && activeColumnMeta?.esMeta?.bucket !== undefined;

  return (
    <>
      <div className="lnsIndexPatternDimensionEditor--padded">
        {supportStaticValue && (
          <DimensionEditorButtonGroups
            selectedMethod={isStatic ? 'static_value' : 'esql'}
            onMethodChange={() => {}}
            options={[
              {
                id: 'static_value',
                enabled: true,
                state: isStatic,
                label: i18n.translate('xpack.lens.indexPattern.staticValueLabel', {
                  defaultMessage: 'Static value',
                }),
                onClick: () => {
                  const value =
                    selectedField?.previousStaticValue ?? activeTable?.rows[0]?.[columnId];
                  setStaticValue(typeof value === 'number' ? value : 0);
                },
              },
              {
                id: 'esql',
                enabled: true,
                state: !isStatic,
                label: i18n.translate('xpack.lens.textBasedLanguages.esqlColumnLabel', {
                  defaultMessage: 'ES|QL',
                }),
                onClick: () => {
                  if (selectedField?.valueSource?.type !== 'static' && selectedField) return;
                  setState((previousState) => {
                    const layer = previousState.layers[layerId];
                    const previousColumn = layer.columns.find(
                      (column) => column.columnId === columnId
                    );
                    const column = {
                      ...previousColumn,
                      columnId,
                      fieldName: '',
                      label: previousColumn?.customLabel ? previousColumn.label : undefined,
                      variable: undefined,
                      valueSource: { type: 'unconfigured' as const },
                      previousStaticValue:
                        previousColumn?.valueSource?.type === 'static'
                          ? previousColumn.valueSource.value
                          : previousColumn?.previousStaticValue,
                    };
                    return mergeLayer({
                      state: previousState,
                      layerId,
                      newLayer: {
                        ...layer,
                        columns: previousColumn
                          ? layer.columns.map((existing) =>
                              existing.columnId === columnId ? column : existing
                            )
                          : [...layer.columns, column],
                      },
                    });
                  });
                },
              },
            ]}
          />
        )}
        {isStatic ? (
          <EuiFormRow
            label={
              props.paramEditorCustomProps?.labels?.[0] ??
              i18n.translate('xpack.lens.textBasedLanguages.referenceValueLabel', {
                defaultMessage: 'Reference line value',
              })
            }
            fullWidth
          >
            <EuiFieldNumber
              value={
                selectedField?.valueSource?.type === 'static' ? selectedField.valueSource.value : 0
              }
              onChange={(event) => {
                if (event.target.value !== '') setStaticValue(Number(event.target.value));
              }}
              data-test-subj="lns-indexPattern-static_value-input"
              compressed
              fullWidth
              step="any"
            />
          </EuiFormRow>
        ) : (
          <>
            <EuiFormRow
              data-test-subj="text-based-languages-field-selection-row"
              label={i18n.translate('xpack.lens.textBasedLanguages.chooseField', {
                defaultMessage: 'Field',
              })}
              fullWidth
            >
              <FieldSelect
                key={selectedField?.fieldName ?? columnId}
                data-test-subj="text-based-dimension-field"
                existingFields={allColumns ?? []}
                selectedField={
                  selectedField?.valueSource?.type === 'static' ||
                  selectedField?.valueSource?.type === 'unconfigured'
                    ? undefined
                    : selectedField
                }
                onChoose={(choice) => {
                  const column = allColumns?.find((f) => f.name === choice.field);
                  const newColumn = {
                    columnId: props.columnId,
                    fieldName: choice.field,
                    meta: column?.meta,
                    variable: column?.variable,
                    label: choice.field,
                    ...(isMetricDimension && { inMetricDimension: true }),
                  };
                  return props.setState(
                    !selectedField
                      ? {
                          ...props.state,
                          layers: {
                            ...props.state.layers,
                            [props.layerId]: {
                              ...props.state.layers[props.layerId],
                              columns: [...props.state.layers[props.layerId].columns, newColumn],
                            },
                          },
                        }
                      : {
                          ...props.state,
                          layers: {
                            ...props.state.layers,
                            [props.layerId]: {
                              ...props.state.layers[props.layerId],
                              columns: props.state.layers[props.layerId].columns.map((col) => {
                                if (col.columnId !== props.columnId) {
                                  return col;
                                }

                                const isNewColumnNumeric = column?.meta?.type === 'number';
                                const shouldKeepCustomLabel = Boolean(col.customLabel);

                                return {
                                  ...col,
                                  fieldName: choice.field,
                                  valueSource: { type: 'query' },
                                  meta: column?.meta,
                                  variable: column?.variable,
                                  // If the new column is not numeric, remove the format selector params
                                  ...(!isNewColumnNumeric && col.params
                                    ? { params: undefined }
                                    : {}),
                                  // If the previous column has a custom label, keep it
                                  ...(shouldKeepCustomLabel
                                    ? {}
                                    : {
                                        label: choice.field,
                                        customLabel: false,
                                      }),
                                };
                              }),
                            },
                          },
                        }
                  );
                }}
              />
            </EuiFormRow>
          </>
        )}
        {selectedField && isDateHistogramColumn && (
          <>
            <EuiSpacer size="s" />
            <EuiFormRow display="rowCompressed" hasChildLabel={false}>
              <EuiSwitch
                label={
                  <EuiText size="xs">
                    {i18n.translate('xpack.lens.indexPattern.dateHistogram.dropPartialBuckets', {
                      defaultMessage: 'Drop partial intervals',
                    })}
                  </EuiText>
                }
                data-test-subj="lensDropPartialIntervals"
                checked={selectedField.params?.dropPartials ?? true}
                onChange={(e) => onDropPartialsChange(e.target.checked)}
                compressed
              />
            </EuiFormRow>
          </>
        )}
      </div>
      {props.dataSectionExtra && (
        <div
          css={css`
            &:not(:empty) {
              padding: 0 ${euiTheme.size.base} ${euiTheme.size.base};
            }
          `}
        >
          {props.dataSectionExtra}
        </div>
      )}
      {!isFullscreen && selectedField && (
        <div className="lnsIndexPatternDimensionEditor--padded lnsIndexPatternDimensionEditor--collapseNext">
          <EuiText
            size="s"
            css={css`
              margin-bottom: ${euiTheme.size.base};
            `}
          >
            <h4>
              {i18n.translate('xpack.lens.indexPattern.dimensionEditor.headingAppearance', {
                defaultMessage: 'Appearance',
              })}
            </h4>
          </EuiText>

          <NameInput
            value={selectedField.customLabel ? selectedField.label ?? '' : ''}
            defaultValue={selectedField.fieldName}
            onChange={(value) => {
              updateLayer(
                updateColumnLabel({
                  layer: state.layers[layerId],
                  columnId,
                  value,
                })
              );
            }}
          />

          {isNumericColumn && enableFormatSelector ? (
            <FormatSelector
              selectedColumn={selectedField}
              onChange={onFormatChange}
              docLinks={props.core.docLinks}
            />
          ) : null}
        </div>
      )}
    </>
  );
}
