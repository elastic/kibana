/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { SearchResponse } from 'elasticsearch';

import { StaticIndexPattern } from 'ui/index_patterns';

import { ml } from '../../../../../services/ml_api_service';
import { getNestedProperty } from '../../../../../util/object_utils';

import {
  getDefaultSelectableFields,
  getFlattenedFields,
  isDefaultQuery,
  EsDoc,
  EsDocSource,
  EsFieldName,
  PivotQuery,
} from '../../../../common';

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
  indexPattern: StaticIndexPattern,
  query: PivotQuery,
  selectedFields: EsFieldName[],
  setSelectedFields: React.Dispatch<React.SetStateAction<EsFieldName[]>>
): UseSourceIndexDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(SOURCE_INDEX_STATUS.UNUSED);
  const [tableItems, setTableItems] = useState<EsDoc[]>([]);

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

      if (docs.length === 0) {
        setTableItems([]);
        setStatus(SOURCE_INDEX_STATUS.LOADED);
        return;
      }

      if (selectedFields.length === 0) {
        const newSelectedFields = getDefaultSelectableFields(docs);
        setSelectedFields(newSelectedFields);
      }

      // Create a version of the doc's source with flattened field names.
      // This avoids confusion later on if a field name has dots in its name
      // or is a nested fields when displaying it via EuiInMemoryTable.
      const flattenedFields = getFlattenedFields(docs[0]._source);
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
        });
        return {
          ...doc,
          _source: item,
        };
      });

      setTableItems(transformedTableItems);
      setStatus(SOURCE_INDEX_STATUS.LOADED);
    } catch (e) {
      if (e.message !== undefined) {
        setErrorMessage(e.message);
      } else {
        setErrorMessage(JSON.stringify(e));
      }
      setTableItems([]);
      setStatus(SOURCE_INDEX_STATUS.ERROR);
    }
  };

  useEffect(() => {
    getSourceIndexData();
  }, [indexPattern.title, JSON.stringify(query)]);
  return { errorMessage, status, tableItems };
};
