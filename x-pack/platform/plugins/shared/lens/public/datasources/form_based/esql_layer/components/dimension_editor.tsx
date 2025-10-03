/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, useEuiTheme, EuiText } from '@elastic/eui';
import { buildEsQuery } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core/public';
import { type DataPublicPluginStart, getEsQueryConfig } from '@kbn/data-plugin/public';
import { getTime } from '@kbn/data-plugin/common';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import { NameInput } from '@kbn/visualization-ui-components';
import { css } from '@emotion/react';
import { mergeLayer, updateColumnFormat, updateColumnLabel } from '../utils';
import type { FormatSelectorProps } from '../../dimension_panel/format_selector';
import { FormatSelector } from '../../dimension_panel/format_selector';
import type { DatasourceDimensionEditorProps, DataType } from '../../../../types';
import { FieldSelect, type FieldOptionCompatible } from './field_select';
import type { TextBasedPrivateState } from '../types';
import { isNotNumeric, isNumeric } from '../utils';
import type { TextBasedLayer } from '../types';

export type TextBasedDimensionEditorProps =
  DatasourceDimensionEditorProps<TextBasedPrivateState> & {
    data: DataPublicPluginStart;
  };

const getTimeFilter = (
  queryService: DataPublicPluginStart['query'],
  uiSettings: IUiSettingsClient,
  timeFieldName?: string
) => {
  const esQueryConfigs = getEsQueryConfig(uiSettings);
  const timeFilter =
    queryService.timefilter.timefilter.getTime() &&
    getTime(undefined, queryService.timefilter.timefilter.getTime(), {
      fieldName: timeFieldName,
    });

  return buildEsQuery(undefined, [], [...(timeFilter ? [timeFilter] : [])], esQueryConfigs);
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
    data,
    esqlVariables,
    core,
  } = props;

  useEffect(() => {
    // in case the columns are not in the cache, I refetch them
    async function fetchColumns() {
      if (query) {
        const abortController = new AbortController();
        const timeFilter = Object.values(indexPatterns).length
          ? getTimeFilter(
              data.query,
              core.uiSettings,
              Object.values(indexPatterns)[0].timeFieldName
            )
          : undefined;
        const columnsFromQuery = await getESQLQueryColumns({
          esqlQuery: query.esql,
          search: data.search.search,
          timeRange: { from: dateRange.fromDate, to: dateRange.toDate },
          filter: timeFilter,
          variables: esqlVariables,
          dropNullColumns: true,
          signal: abortController.signal,
        });
        if (columnsFromQuery.length) {
          const hasNumberTypeColumns = columnsFromQuery?.some(isNumeric);
          const columns = columnsFromQuery.map((col) => {
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
    core.uiSettings,
    data.query,
    data.search.search,
    dateRange.fromDate,
    dateRange.toDate,
    esqlVariables,
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
