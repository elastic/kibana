/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import React, { useEffect, useState } from 'react';

import { SearchResponse } from 'elasticsearch';

import { IndexPattern } from 'ui/index_patterns';

import { ml } from '../../../services/ml_api_service';

import { isDefaultQuery, PivotQuery } from '../../common';
import { EsDoc, EsFieldName, getDefaultSelectableFields, getFlattenedFields } from './common';

const SEARCH_SIZE = 1000;

export enum SOURCE_INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

export interface UseSourceIndexDataReturnType {
  errorMessage: string;
  status: SOURCE_INDEX_STATUS;
  tableItems: EsDoc[];
}

export const useSourceIndexData = (
  indexPattern: IndexPattern,
  query: PivotQuery,
  selectedFields: EsFieldName[],
  setSelectedFields: React.Dispatch<React.SetStateAction<EsFieldName[]>>
): UseSourceIndexDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(SOURCE_INDEX_STATUS.UNUSED);
  const [tableItems, setTableItems] = useState([] as EsDoc[]);

  const getSourceIndexData = async function() {
    setErrorMessage('');
    setStatus(SOURCE_INDEX_STATUS.LOADING);

    try {
      const resp: SearchResponse<any> = await ml.esSearch({
        index: indexPattern.title,
        size: SEARCH_SIZE,
        // Instead of using the default query (`*`), fall back to a more efficient `match_all` query.
        body: { query: isDefaultQuery(query) ? { match_all: {} } : query },
      });

      const docs = resp.hits.hits;

      if (selectedFields.length === 0) {
        const newSelectedFields = getDefaultSelectableFields(docs);
        setSelectedFields(newSelectedFields);
      }

      // Create a version of the doc's source with flattened field names.
      // This avoids confusion later on if a field name has dots in its name
      // or is a nested fields when displaying it via EuiInMemoryTable.
      const flattenedFields = getFlattenedFields(docs[0]._source);
      const transformedTableItems = docs.map(doc => {
        const item = {} as {
          [key: string]: any;
        };
        flattenedFields.forEach(ff => {
          item[ff] = get(doc._source, ff);
          if (item[ff] === undefined) {
            item[ff] = doc._source[`"${ff}"`];
          }
        });
        return {
          ...doc,
          _source: item,
        };
      });

      setTableItems(transformedTableItems as EsDoc[]);
      setStatus(SOURCE_INDEX_STATUS.LOADED);
    } catch (e) {
      setErrorMessage(JSON.stringify(e));
      setTableItems([] as EsDoc[]);
      setStatus(SOURCE_INDEX_STATUS.ERROR);
    }
  };

  useEffect(
    () => {
      getSourceIndexData();
    },
    [indexPattern.title, JSON.stringify(query)]
  );
  return { errorMessage, status, tableItems };
};
