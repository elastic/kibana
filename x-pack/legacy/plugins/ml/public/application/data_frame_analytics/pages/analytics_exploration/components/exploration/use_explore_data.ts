/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { SearchResponse } from 'elasticsearch';

import { SortDirection, SORT_DIRECTION } from '../../../../../components/ml_in_memory_table';

import { ml } from '../../../../../services/ml_api_service';
import { getNestedProperty } from '../../../../../util/object_utils';

import {
  getDefaultSelectableFields,
  getFlattenedFields,
  DataFrameAnalyticsConfig,
  EsFieldName,
  INDEX_STATUS,
  SEARCH_SIZE,
  defaultSearchQuery,
  SearchQuery,
} from '../../../../common';

import { getOutlierScoreFieldName } from './common';
import { SavedSearchQuery } from '../../../../../contexts/kibana';

export type TableItem = Record<string, any>;

interface LoadExploreDataArg {
  field: string;
  direction: SortDirection;
  searchQuery: SavedSearchQuery;
}

export interface UseExploreDataReturnType {
  errorMessage: string;
  loadExploreData: (arg: LoadExploreDataArg) => void;
  sortField: EsFieldName;
  sortDirection: SortDirection;
  status: INDEX_STATUS;
  tableItems: TableItem[];
}

export const useExploreData = (
  jobConfig: DataFrameAnalyticsConfig | undefined,
  selectedFields: EsFieldName[],
  setSelectedFields: React.Dispatch<React.SetStateAction<EsFieldName[]>>
): UseExploreDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(INDEX_STATUS.UNUSED);
  const [tableItems, setTableItems] = useState<TableItem[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>(SORT_DIRECTION.ASC);

  const loadExploreData = async ({ field, direction, searchQuery }: LoadExploreDataArg) => {
    if (jobConfig !== undefined) {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);

      try {
        const resultsField = jobConfig.dest.results_field;

        const body: SearchQuery = {
          query: searchQuery,
        };

        if (field !== undefined) {
          body.sort = [
            {
              [field]: {
                order: direction,
              },
            },
          ];
        }

        const resp: SearchResponse<any> = await ml.esSearch({
          index: jobConfig.dest.index,
          size: SEARCH_SIZE,
          body,
        });

        setSortField(field);
        setSortDirection(direction);

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
  };

  useEffect(() => {
    if (jobConfig !== undefined) {
      loadExploreData({
        field: getOutlierScoreFieldName(jobConfig),
        direction: SORT_DIRECTION.DESC,
        searchQuery: defaultSearchQuery,
      });
    }
  }, [jobConfig && jobConfig.id]);

  return { errorMessage, loadExploreData, sortField, sortDirection, status, tableItems };
};
