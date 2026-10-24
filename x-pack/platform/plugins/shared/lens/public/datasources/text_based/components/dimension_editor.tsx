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
import { useDebouncedValue } from '@kbn/visualization-utils';
import { css } from '@emotion/react';
import type {
  TextBasedPrivateState,
  TextBasedLayer,
  TextBasedLayerColumn,
  DatasourceDimensionEditorProps,
  DataType,
} from '@kbn/lens-common';
import { DEFAULT_STATIC_VALUE, staticValueOperationName } from '@kbn/lens-common';
import {
  mergeLayer,
  updateColumnFormat,
  updateColumnLabel,
  isNotNumeric,
  isNumeric,
  updateColumnDropPartials,
  isStaticValueColumn,
  isValidStaticValue,
  removeStaticValue,
} from '../utils';
import type { FormatSelectorProps } from '../../form_based/dimension_panel/format_selector';
import { FormatSelector } from '../../form_based/dimension_panel/format_selector';
import { FieldSelect, type FieldOptionCompatible } from './field_select';
import { fetchFieldsFromESQLExpression } from './fetch_fields_from_esql_expression';

export type TextBasedDimensionEditorProps =
  DatasourceDimensionEditorProps<TextBasedPrivateState> & {
    expressions: ExpressionsStart;
  };

export function TextBasedDimensionEditor(props: TextBasedDimensionEditorProps) {
  const [allColumns, setAllColumns] = useState<FieldOptionCompatible[]>([]);
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

  const isStatic = Boolean(selectedField && isStaticValueColumn(selectedField));
  const setStaticValue = useCallback(
    (value: string | undefined) => {
      // Same validation as the form-based static value editor.
      if (!isValidStaticValue(value)) return;
      if (
        selectedField &&
        isStaticValueColumn(selectedField) &&
        selectedField.params?.value === value
      )
        return;
      setState((previousState) => {
        const layer = previousState.layers[layerId];
        const previousColumn = layer.columns.find((column) => column.columnId === columnId);
        const column: TextBasedLayerColumn = {
          ...previousColumn,
          columnId,
          fieldName: value,
          label: previousColumn?.customLabel ? previousColumn.label : value,
          variable: undefined,
          operationType: staticValueOperationName,
          params: { ...previousColumn?.params, value },
          meta: { type: 'number' as const },
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
    [columnId, layerId, selectedField, setState]
  );
  const activeTable = props.activeData?.[layerId];
  const activeValue = activeTable?.rows[0]?.[columnId];
  const { inputValue: staticInputValue, handleInputChange: handleStaticInputChange } =
    useDebouncedValue<string | undefined>(
      {
        value:
          selectedField && isStaticValueColumn(selectedField)
            ? selectedField.params?.value
            : typeof activeValue === 'number'
            ? String(activeValue)
            : String(DEFAULT_STATIC_VALUE),
        onChange: setStaticValue,
      },
      { allowFalsyValue: true }
    );
  const isStaticInputValid = isValidStaticValue(staticInputValue);
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
        {isStatic ? (
          <EuiFormRow
            label={
              props.paramEditorCustomProps?.labels?.[0] ??
              i18n.translate('xpack.lens.textBasedLanguages.referenceValueLabel', {
                defaultMessage: 'Reference line value',
              })
            }
            fullWidth
            isInvalid={!isStaticInputValid}
            error={
              !isStaticInputValid &&
              i18n.translate('xpack.lens.textBasedLanguages.staticValueError', {
                defaultMessage: 'The static value of {value} is not a valid number',
                values: { value: staticInputValue ?? "''" },
              })
            }
          >
            <EuiFieldNumber
              isInvalid={!isStaticInputValid}
              value={staticInputValue ?? ''}
              onChange={(event) => handleStaticInputChange(event.currentTarget.value)}
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
                  selectedField && isStaticValueColumn(selectedField) ? undefined : selectedField
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
                                  ...removeStaticValue(col),
                                  fieldName: choice.field,
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
