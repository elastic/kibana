/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, useEuiTheme, EuiText } from '@elastic/eui';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { NameInput } from '@kbn/visualization-ui-components';
import { css } from '@emotion/react';
import type {
  TextBasedPrivateState,
  TextBasedLayer,
  DatasourceDimensionEditorProps,
  DataType,
} from '@kbn/lens-common';
import { mergeLayer, updateColumnFormat, updateColumnLabel } from '../utils';
import type { FormatSelectorProps } from '../../form_based/dimension_panel/format_selector';
import { FormatSelector } from '../../form_based/dimension_panel/format_selector';
import { FieldSelect, type FieldOptionCompatible } from './field_select';
import { isNotNumeric, isNumeric } from '../utils';
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
  } = props;

  useEffect(() => {
    // in case the columns are not in the cache, I refetch them
    async function fetchColumns() {
      if (query) {
        const table = await fetchFieldsFromESQLExpression(
          { esql: `${query.esql} | limit 0` },
          expressions,
          { from: dateRange.fromDate, to: dateRange.toDate },
          undefined,
          Object.values(indexPatterns).length
            ? Object.values(indexPatterns)[0].timeFieldName
            : undefined,
          esqlVariables
        );

        if (table) {
          const hasNumberTypeColumns = table.columns?.some(isNumeric);
          const columns = table.columns.map((col) => {
            return {
              id: col.variable ?? col.id,
              name: col.variable ? `??${col.variable}` : col.name,
              meta: col?.meta ?? { type: 'number' },
              variable: col.variable,
              compatible:
                props.isMetricDimension && hasNumberTypeColumns
                  ? props.filterOperations({
                      dataType: col?.meta?.type as DataType,
                      isBucketed: Boolean(isNotNumeric(col)),
                      scale: 'ordinal',
                    })
                  : true,
            };
          });
          setAllColumns(columns);
        }
      }
    }
    fetchColumns();
  }, [
    dateRange.fromDate,
    dateRange.toDate,
    esqlVariables,
    expressions,
    indexPatterns,
    props,
    query,
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

  return (
    <>
      <EuiFormRow
        data-test-subj="text-based-languages-field-selection-row"
        label={i18n.translate('xpack.lens.textBasedLanguages.chooseField', {
          defaultMessage: 'Field',
        })}
        fullWidth
        className="lnsIndexPatternDimensionEditor--padded"
      >
        <FieldSelect
          data-test-subj="text-based-dimension-field"
          existingFields={allColumns ?? []}
          selectedField={selectedField}
          onChoose={(choice) => {
            const column = allColumns?.find((f) => f.name === choice.field);
            const newColumn = {
              columnId: props.columnId,
              fieldName: choice.field,
              meta: column?.meta,
              variable: column?.variable,
              label: choice.field,
              ...(props.isMetricDimension && { inMetricDimension: true }),
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
                        columns: props.state.layers[props.layerId].columns.map((col) =>
                          col.columnId !== props.columnId
                            ? col
                            : {
                                ...col,
                                fieldName: choice.field,
                                meta: column?.meta,
                                variable: column?.variable,
                              }
                        ),
                      },
                    },
                  }
            );
          }}
        />
      </EuiFormRow>
      {props.dataSectionExtra && (
        <div
          style={{
            paddingLeft: euiTheme.size.base,
            paddingRight: euiTheme.size.base,
          }}
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
            value={selectedField.label || ''}
            defaultValue={''}
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

          {selectedField.meta?.type === 'number' ? (
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
