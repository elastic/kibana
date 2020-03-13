/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { SearchResponse } from 'elasticsearch';

import { EuiDataGridPaginationProps } from '@elastic/eui';

import { IIndexPattern } from '../../../../../../../../../../../src/plugins/data/common/index_patterns';

import { SavedSearchQuery } from '../../../../../contexts/ml';
import { ml } from '../../../../../services/ml_api_service';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { getIndexPatternIdFromName } from '../../../../../util/index_utils';
import { getNestedProperty } from '../../../../../util/object_utils';
import { useMlContext } from '../../../../../contexts/ml';

import {
  getDefaultSelectableFields,
  getFlattenedFields,
  DataFrameAnalyticsConfig,
  EsFieldName,
  INDEX_STATUS,
  defaultSearchQuery,
  SearchQuery,
} from '../../../../common';
import { isKeywordAndTextType } from '../../../../common/fields';

import { getOutlierScoreFieldName } from './common';

export type TableItem = Record<string, any>;

type Pagination = Pick<EuiDataGridPaginationProps, 'pageIndex' | 'pageSize'>;

interface UseExploreDataReturnType {
  errorMessage: string;
  indexPattern: IIndexPattern | undefined;
  jobConfig: DataFrameAnalyticsConfig | undefined;
  pagination: Pagination;
  searchQuery: SavedSearchQuery;
  selectedFields: EsFieldName[];
  setJobConfig: Dispatch<SetStateAction<DataFrameAnalyticsConfig | undefined>>;
  setPagination: Dispatch<SetStateAction<Pagination>>;
  setSearchQuery: Dispatch<SetStateAction<SavedSearchQuery>>;
  setSelectedFields: Dispatch<SetStateAction<EsFieldName[]>>;
  rowCount: number;
  status: INDEX_STATUS;
  tableFields: string[];
  tableItems: TableItem[];
}

// The types specified in `@types/elasticsearch` are out of date and still have `total: number`.
interface SearchResponse7 extends SearchResponse<any> {
  hits: SearchResponse<any>['hits'] & {
    total: {
      value: number;
      relation: string;
    };
  };
}

export const useExploreData = (jobId: string): UseExploreDataReturnType => {
  const [indexPattern, setIndexPattern] = useState<IIndexPattern | undefined>(undefined);
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(INDEX_STATUS.UNUSED);

  const [selectedFields, setSelectedFields] = useState([] as EsFieldName[]);
  const [tableFields, setTableFields] = useState<string[]>([]);
  const [tableItems, setTableItems] = useState<TableItem[]>([]);
  const [rowCount, setRowCount] = useState(0);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);

  // get analytics configuration
  useEffect(() => {
    (async function() {
      const analyticsConfigs = await ml.dataFrameAnalytics.getDataFrameAnalytics(jobId);
      if (
        Array.isArray(analyticsConfigs.data_frame_analytics) &&
        analyticsConfigs.data_frame_analytics.length > 0
      ) {
        setJobConfig(analyticsConfigs.data_frame_analytics[0]);
      }
    })();
  }, []);

  const mlContext = useMlContext();

  useEffect(() => {
    (async () => {
      if (jobConfig !== undefined) {
        const sourceIndex = jobConfig.source.index[0];
        const indexPatternId = getIndexPatternIdFromName(sourceIndex) || sourceIndex;
        const jobCapsIndexPattern: IIndexPattern = await mlContext.indexPatterns.get(
          indexPatternId
        );
        if (jobCapsIndexPattern !== undefined) {
          setIndexPattern(jobCapsIndexPattern);
          await newJobCapsService.initializeFromIndexPattern(jobCapsIndexPattern, false, false);
        }
      }
    })();
  }, [jobConfig && jobConfig.id]);

  // update data grid data
  useEffect(() => {
    (async () => {
      if (jobConfig !== undefined) {
        setErrorMessage('');
        setStatus(INDEX_STATUS.LOADING);

        try {
          const resultsField = jobConfig.dest.results_field;

          const outlierScoreFieldName = getOutlierScoreFieldName(jobConfig);
          const outlierScoreFieldSelected = selectedFields.includes(outlierScoreFieldName);
          let requiresKeyword = false;

          const field = outlierScoreFieldSelected ? outlierScoreFieldName : selectedFields[0];
          const direction = outlierScoreFieldSelected ? 'desc' : 'asc';

          if (outlierScoreFieldSelected === false) {
            requiresKeyword = isKeywordAndTextType(field);
          }

          const body: SearchQuery = {
            query: searchQuery,
          };

          if (field !== undefined) {
            body.sort = [
              {
                [`${field}${requiresKeyword ? '.keyword' : ''}`]: {
                  order: direction,
                },
              },
            ];
          }

          const { pageIndex, pageSize } = pagination;
          const resp: SearchResponse7 = await ml.esSearch({
            index: jobConfig.dest.index,
            from: pageIndex * pageSize,
            size: pageSize,
            body,
          });

          setRowCount(resp.hits.total.value);

          const docs = resp.hits.hits;

          if (docs.length === 0) {
            setTableItems([]);
            setStatus(INDEX_STATUS.LOADED);
            return;
          }

          if (selectedFields.length === 0) {
            const newSelectedFields = getDefaultSelectableFields(docs, resultsField);
            setSelectedFields(newSelectedFields);
          }

          // Create a version of the doc's source with flattened field names.
          // This avoids confusion later on if a field name has dots in its name
          // or is a nested fields when displaying it via EuiInMemoryTable.
          const flattenedFields = getFlattenedFields(docs[0]._source, resultsField);
          const transformedTableItems = docs.map(doc => {
            const item: TableItem = {};
            flattenedFields.forEach(ff => {
              item[ff] = getNestedProperty(doc._source, ff);
              if (item[ff] === undefined) {
                // If the attribute is undefined, it means it was not a nested property
                // but had dots in its actual name. This selects the property by its
                // full name and assigns it to `item[ff]`.
                item[ff] = doc._source[`"${ff}"`];
              }
              if (item[ff] === undefined) {
                const parts = ff.split('.');
                if (parts[0] === resultsField && parts.length >= 2) {
                  parts.shift();
                  if (doc._source[resultsField] !== undefined) {
                    item[ff] = doc._source[resultsField][parts.join('.')];
                  }
                }
              }
            });
            return item;
          });

          setTableFields(flattenedFields);
          setTableItems(transformedTableItems);
          setStatus(INDEX_STATUS.LOADED);
        } catch (e) {
          if (e.message !== undefined) {
            setErrorMessage(e.message);
          } else {
            setErrorMessage(JSON.stringify(e));
          }
          setTableItems([]);
          setStatus(INDEX_STATUS.ERROR);
        }
      }
    })();
  }, [jobConfig && jobConfig.id, pagination, searchQuery, selectedFields]);

  return {
    errorMessage,
    indexPattern,
    jobConfig,
    pagination,
    rowCount,
    searchQuery,
    selectedFields,
    setJobConfig,
    setPagination,
    setSearchQuery,
    setSelectedFields,
    status,
    tableFields,
    tableItems,
  };
};
