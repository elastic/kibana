/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import type { estypes } from '@elastic/elasticsearch';
import type { EuiDataGridColumn } from '@elastic/eui';

import type { CoreSetup } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '@kbn/ml-agg-utils';
import {
  getCombinedRuntimeMappings,
  isRuntimeMappings,
  type RuntimeMappings,
} from '@kbn/ml-runtime-field-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { EsSorting, UseIndexDataReturnType } from '@kbn/ml-data-grid';
import {
  getFieldType,
  getDataGridSchemaFromKibanaFieldType,
  getDataGridSchemaFromESFieldType,
  getPopulatedFieldsFromKibanaDataView,
  showDataGridColumnChartErrorMessageToast,
  useDataGrid,
  useRenderCellValue,
  getProcessedFields,
  INDEX_STATUS,
} from '@kbn/ml-data-grid';

import { useMlApi, useMlKibana } from '../../../../contexts/kibana';
import { DataLoader } from '../../../../datavisualizer/index_based/data_loader';

type IndexSearchResponse = estypes.SearchResponse;

interface MLEuiDataGridColumn extends EuiDataGridColumn {
  isRuntimeFieldColumn?: boolean;
}

function getRuntimeFieldColumns(runtimeMappings: RuntimeMappings) {
  return Object.keys(runtimeMappings).map((id) => {
    let field = runtimeMappings[id];
    if (Array.isArray(field)) {
      field = field[0];
    }
    const schema = getDataGridSchemaFromESFieldType(
      field.type as estypes.MappingRuntimeField['type']
    );
    return { id, schema, isExpandable: schema !== 'boolean', isRuntimeFieldColumn: true };
  });
}

function getDataViewColumns(dataView: DataView, fieldsFilter: string[]) {
  const { fields } = dataView;

  return fields
    .filter((field) => fieldsFilter.includes(field.name))
    .map((field) => {
      const schema =
        // @ts-expect-error field is not DataViewField
        getDataGridSchemaFromESFieldType(field.type) || getDataGridSchemaFromKibanaFieldType(field);

      return {
        id: field.name,
        schema,
        isExpandable: schema !== 'boolean',
        isRuntimeFieldColumn: false,
      };
    });
}

export const useIndexData = (
  dataView: DataView,
  query: Record<string, any> | undefined,
  toastNotifications: CoreSetup['notifications']['toasts'],
  runtimeMappings?: RuntimeMappings
): UseIndexDataReturnType => {
  const isMounted = useMountedState();
  const {
    services: {
      data: { dataViews: dataViewsService },
    },
  } = useMlKibana();
  const mlApi = useMlApi();
  const [dataViewFields, setDataViewFields] = useState<string[]>();
  const [timeRangeMs, setTimeRangeMs] = useState<TimeRangeMs | undefined>();
  const abortController = useRef(new AbortController());

  // To be used for data grid column selection
  // and will be applied to doc and chart queries.
  const combinedRuntimeMappings = useMemo(
    () => getCombinedRuntimeMappings(dataView, runtimeMappings),
    [dataView, runtimeMappings]
  );

  useEffect(() => {
    async function fetchPopulatedFields() {
      if (abortController.current) {
        abortController.current.abort();
        abortController.current = new AbortController();
      }

      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);

      try {
        const nonEmptyFields = await dataViewsService.getFieldsForIndexPattern(dataView, {
          includeEmptyFields: false,
          // dummy filter, if no filter was provided the function would return all fields.
          indexFilter: {
            bool: { must: { match_all: {} } },
          },
          runtimeMappings: combinedRuntimeMappings,
          abortSignal: abortController.current.signal,
        });

        const populatedFields = nonEmptyFields.map((field) => field.name);

        if (isMounted()) {
          setDataViewFields(getPopulatedFieldsFromKibanaDataView(dataView, populatedFields));
        }
      } catch (e) {
        if (e?.name !== 'AbortError') {
          setErrorMessage(extractErrorMessage(e));
          setStatus(INDEX_STATUS.ERROR);
        }
      }
    }

    fetchPopulatedFields();

    return () => {
      abortController.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Available data grid columns, will be a combination of index pattern and runtime fields.
  const [columns, setColumns] = useState<MLEuiDataGridColumn[]>([]);
  useEffect(() => {
    if (Array.isArray(dataViewFields)) {
      setColumns([
        ...getDataViewColumns(dataView, dataViewFields),
        ...(combinedRuntimeMappings ? getRuntimeFieldColumns(combinedRuntimeMappings) : []),
      ]);
    }
  }, [dataView, dataViewFields, combinedRuntimeMappings]);

  const dataGrid = useDataGrid(columns);

  const {
    pagination,
    resetPagination,
    setErrorMessage,
    setRowCountInfo,
    setStatus,
    setTableItems,
    sortingColumns,
    tableItems,
  } = dataGrid;

  useEffect(() => {
    resetPagination();
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  useEffect(() => {
    async function fetchIndexData() {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);

      const timeFieldName = dataView.getTimeField()?.name;
      const sort: EsSorting = sortingColumns.reduce((s, column) => {
        s[column.id] = { order: column.direction };
        return s;
      }, {} as EsSorting);
      const esSearchRequest = {
        index: dataView.title,
        body: {
          query,
          from: pagination.pageIndex * pagination.pageSize,
          size: pagination.pageSize,
          fields: [
            ...(dataViewFields ?? []),
            ...(isRuntimeMappings(combinedRuntimeMappings)
              ? Object.keys(combinedRuntimeMappings)
              : []),
          ],
          _source: false,
          ...(Object.keys(sort).length > 0 ? { sort } : {}),
          ...(isRuntimeMappings(combinedRuntimeMappings)
            ? { runtime_mappings: combinedRuntimeMappings }
            : {}),
          ...(timeFieldName
            ? {
                aggs: {
                  earliest: {
                    min: {
                      field: timeFieldName,
                    },
                  },
                  latest: {
                    max: {
                      field: timeFieldName,
                    },
                  },
                },
              }
            : {}),
        },
      };

      try {
        const resp: IndexSearchResponse = await mlApi.esSearch(esSearchRequest);

        if (
          resp.aggregations &&
          isPopulatedObject(resp.aggregations.earliest, ['value']) &&
          isPopulatedObject(resp.aggregations.latest, ['value'])
        ) {
          setTimeRangeMs({
            from: resp.aggregations.earliest.value as number,
            to: resp.aggregations.latest.value as number,
          } as TimeRangeMs);
        }
        const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));

        setRowCountInfo({
          rowCount: typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total!.value,
          rowCountRelation:
            typeof resp.hits.total === 'number'
              ? ('eq' as estypes.SearchTotalHitsRelation)
              : resp.hits.total!.relation,
        });
        setTableItems(docs);
        setStatus(INDEX_STATUS.LOADED);
      } catch (e) {
        setErrorMessage(extractErrorMessage(e));
        setStatus(INDEX_STATUS.ERROR);
      }
    }

    if (dataViewFields !== undefined && query !== undefined) {
      fetchIndexData();
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataView.title,
    dataViewFields,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([query, pagination, sortingColumns, combinedRuntimeMappings]),
  ]);

  const dataLoader = useMemo(
    () => new DataLoader(dataView, mlApi),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataView]
  );

  useEffect(() => {
    async function fetchColumnChartsData(fieldHistogramsQuery: Record<string, any>) {
      try {
        const columnChartsData = await dataLoader.loadFieldHistograms(
          columns
            .filter((cT) => dataGrid.visibleColumns.includes(cT.id))
            .map((cT) => ({
              fieldName: cT.id,
              type: getFieldType(cT.schema),
            })),
          fieldHistogramsQuery,
          DEFAULT_SAMPLER_SHARD_SIZE,
          combinedRuntimeMappings
        );
        dataGrid.setColumnCharts(columnChartsData);
      } catch (e) {
        showDataGridColumnChartErrorMessageToast(e, toastNotifications);
      }
    }

    if (dataGrid.chartsVisible && query !== undefined) {
      fetchColumnChartsData(query);
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataGrid.chartsVisible,
    dataView.title,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([query, dataGrid.visibleColumns, runtimeMappings]),
  ]);

  const renderCellValue = useRenderCellValue(dataView, pagination, tableItems);

  return {
    ...dataGrid,
    dataViewFields,
    renderCellValue,
    timeRangeMs,
  };
};
