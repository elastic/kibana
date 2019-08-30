/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { SearchResponse } from 'elasticsearch';

import { ml } from '../../../../../services/ml_api_service';
import { getNestedProperty } from '../../../../../util/object_utils';

import {
  getDefaultSelectableFields,
  getFlattenedFields,
  DataFrameAnalyticsConfig,
  EsDoc,
  EsDocSource,
  EsFieldName,
} from '../../../../common';

const SEARCH_SIZE = 1000;

export enum INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

export interface UseExploreDataReturnType {
  errorMessage: string;
  status: INDEX_STATUS;
  tableItems: EsDoc[];
}

export const useExploreData = (
  jobConfig: DataFrameAnalyticsConfig | undefined,
  selectedFields: EsFieldName[],
  setSelectedFields: React.Dispatch<React.SetStateAction<EsFieldName[]>>
): UseExploreDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(INDEX_STATUS.UNUSED);
  const [tableItems, setTableItems] = useState<EsDoc[]>([]);

  useEffect(() => {
    (async () => {
      if (jobConfig !== undefined) {
        setErrorMessage('');
        setStatus(INDEX_STATUS.LOADING);

        try {
          const resultsField = jobConfig.dest.results_field;

          const resp: SearchResponse<any> = await ml.esSearch({
            index: jobConfig.dest.index,
            size: SEARCH_SIZE,
            body: {
              query: { match_all: {} },
              sort: [
                {
                  [`${resultsField}.outlier_score`]: {
                    order: 'desc',
                  },
                },
              ],
            },
          });

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
            const item: EsDocSource = {};
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
            return {
              ...doc,
              _source: item,
            };
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
    })();
  }, [jobConfig && jobConfig.id]);

  return { errorMessage, status, tableItems };
};
