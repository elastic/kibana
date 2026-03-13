/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import moment from 'moment';

import { QUERY_MODE, type QueryMode } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import { isOfAggregateQueryType, type Filter } from '@kbn/es-query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { QueryStringContract, TimefilterContract } from '@kbn/data-plugin/public';
import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import { appendToESQLQuery } from '@kbn/esql-utils';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';
import { useDiscoverLinks, createFilter } from '../use_discover_links';
import type { LogCategorizationAppState } from '../../../application/url_state/log_pattern_analysis';
import { getLabels } from './labels';

const DOC_LIMIT = 10000;

export interface OpenInDiscover {
  openFunction: (mode: QueryMode, navigateToDiscover: boolean, category?: Category) => void;
  getLabels: (navigateToDiscover: boolean) => ReturnType<typeof getLabels>;
  count: number;
}

export function onPopulateWhereClause(
  queryString: QueryStringContract,
  fieldName: string,
  value: string,
  mode: QueryMode
) {
  const query = queryString.getQuery();
  if (!isOfAggregateQueryType(query)) {
    return;
  }

  const operator = mode === QUERY_MODE.INCLUDE ? '' : 'NOT ';

  const updatedQuery = appendToESQLQuery(
    query.esql,
    `| WHERE ${operator}MATCH(${fieldName}, "${value}", {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})\n  | LIMIT ${DOC_LIMIT}`
  );

  if (!updatedQuery) {
    return;
  }

  queryString.setQuery({
    esql: updatedQuery,
  });
}

export function useOpenInDiscover(
  dataViewId: string,
  selectedField: DataViewField | string | undefined,
  selectedCategories: Category[],
  aiopsListState: LogCategorizationAppState,
  timefilter: TimefilterContract,
  onAddFilter?: (values: Filter, alias?: string) => void,
  additionalFilter?: CategorizationAdditionalFilter,
  onClose: () => void = () => {}
): OpenInDiscover {
  const { openInDiscoverWithFilter } = useDiscoverLinks();
  const { data } = useAiopsAppContext();

  const openFunction = useCallback(
    (mode: QueryMode, navigateToDiscover: boolean, category?: Category) => {
      if (
        onAddFilter !== undefined &&
        selectedField !== undefined &&
        typeof selectedField !== 'string' &&
        navigateToDiscover === false
      ) {
        const isEsql = isOfAggregateQueryType(data.query.queryString.getQuery());

        if (isEsql) {
          onPopulateWhereClause(
            data.query.queryString,
            selectedField.name,
            selectedCategories[0].key,
            mode
          );
          onClose();
          return;
        }

        onAddFilter(
          createFilter('', selectedField.name, selectedCategories, mode, category),
          `Patterns - ${selectedField.name}`
        );
        onClose();
        return;
      }

      const timefilterActiveBounds =
        additionalFilter !== undefined
          ? {
              min: moment(additionalFilter.from),
              max: moment(additionalFilter.to),
            }
          : timefilter.getActiveBounds();

      if (timefilterActiveBounds === undefined || selectedField === undefined) {
        return;
      }

      openInDiscoverWithFilter(
        dataViewId,
        typeof selectedField === 'string' ? selectedField : selectedField.name,
        selectedCategories,
        aiopsListState,
        timefilterActiveBounds,
        mode,
        category,
        additionalFilter?.field
      );
    },
    [
      onAddFilter,
      selectedField,
      additionalFilter,
      timefilter,
      openInDiscoverWithFilter,
      dataViewId,
      selectedCategories,
      aiopsListState,
      data.query.queryString,
      onClose,
    ]
  );

  return { openFunction, getLabels, count: selectedCategories.length };
}
