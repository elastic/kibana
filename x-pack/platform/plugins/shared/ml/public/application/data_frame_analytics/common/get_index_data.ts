/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { EsSorting, UseDataGridReturnType } from '@kbn/ml-data-grid';
import { getProcessedFields, INDEX_STATUS } from '@kbn/ml-data-grid';

import { mlJobCapsServiceAnalyticsFactory } from '../../services/new_job_capabilities/new_job_capabilities_service_analytics';
import type { MlApi } from '../../services/ml_api_service';

export const getIndexData = async (
  mlApi: MlApi,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  dataGrid: UseDataGridReturnType,
  searchQuery: estypes.QueryDslQueryContainer,
  options: { didCancel: boolean }
) => {
  if (jobConfig !== undefined) {
    const newJobCapsServiceAnalytics = mlJobCapsServiceAnalyticsFactory(mlApi);

    const {
      pagination,
      setErrorMessage,
      setRowCountInfo,
      setStatus,
      setTableItems,
      sortingColumns,
    } = dataGrid;

    setErrorMessage('');
    setStatus(INDEX_STATUS.LOADING);

    try {
      const sort: EsSorting = sortingColumns
        .map((column) => {
          const { id } = column;
          column.id = newJobCapsServiceAnalytics.isKeywordAndTextType(id) ? `${id}.keyword` : id;
          return column;
        })
        .reduce((s, column) => {
          s[column.id] = { order: column.direction };
          return s;
        }, {} as EsSorting);

      const { pageIndex, pageSize } = pagination;
      // TODO: remove results_field from `fields` when possible
      const resp: estypes.SearchResponse = await mlApi.esSearch({
        index: jobConfig.dest.index,
        body: {
          fields: ['*'],
          _source: false,
          query: searchQuery,
          from: pageIndex * pageSize,
          size: pageSize,
          ...(Object.keys(sort).length > 0 ? { sort } : {}),
        },
      });

      if (!options.didCancel) {
        setRowCountInfo({
          rowCount: typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total!.value,
          rowCountRelation:
            typeof resp.hits.total === 'number'
              ? ('eq' as estypes.SearchTotalHitsRelation)
              : resp.hits.total!.relation,
        });
        setTableItems(
          resp.hits.hits.map((d) =>
            getProcessedFields(
              d.fields ?? {},
              (key: string) =>
                key.startsWith(`${jobConfig.dest.results_field}.feature_importance`) ||
                key.startsWith(`${jobConfig.dest.results_field}.feature_influence`)
            )
          )
        );
        setStatus(INDEX_STATUS.LOADED);
      }
    } catch (e) {
      setErrorMessage(extractErrorMessage(e));
      setStatus(INDEX_STATUS.ERROR);
    }
  }
};
