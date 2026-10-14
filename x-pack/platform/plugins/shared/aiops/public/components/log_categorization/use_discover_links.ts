/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import moment from 'moment';

import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import {
  getCategoryQuery,
  type QueryMode,
} from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import type { AiOpsIndexBasedAppState } from '../../application/url_state/common';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

export function useDiscoverLinks() {
  const { share } = useAiopsAppContext();

  const discoverLocator = useMemo(
    () => share?.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share?.url.locators]
  );

  const openInDiscoverWithFilter = (
    index: string,
    field: string,
    selection: Category[],
    aiopsListState: Required<AiOpsIndexBasedAppState>,
    timefilterActiveBounds: TimeRangeBounds,
    mode: QueryMode,
    category?: Category,
    additionalField?: { name: string; value: string },
    /** Full ES|QL query to open, which switches Discover to ES|QL mode. */
    esqlQuery?: string
  ) => {
    if (discoverLocator === undefined) {
      throw new Error('Discover locator is unavailable');
    }

    const timeRange = {
      from: moment(timefilterActiveBounds.min?.valueOf()).toISOString(),
      to: moment(timefilterActiveBounds.max?.valueOf()).toISOString(),
    };
    const url = discoverLocator.getRedirectUrl(
      esqlQuery !== undefined
        ? { query: { esql: esqlQuery }, timeRange }
        : {
            indexPatternId: index,
            timeRange,
            filters: [
              ...aiopsListState.filters,
              createFilter(index, field, selection, mode, category, additionalField),
            ],
            query: {
              language: aiopsListState.searchQueryLanguage,
              query: aiopsListState.searchString,
            },
          }
    );
    window.open(url, '_blank');
  };

  return { openInDiscoverWithFilter };
}

export function createFilter(
  index: string,
  field: string,
  selection: Category[],
  mode: QueryMode,
  category?: Category,
  additionalField?: { name: string; value: string }
): Filter {
  const selectedRows = category === undefined ? selection : [category];
  const query = getCategoryQuery(field, selectedRows, mode);
  if (additionalField !== undefined) {
    query.bool.must = [
      {
        term: { [additionalField.name]: additionalField.value },
      },
    ];
  }
  return {
    query,
    meta: {
      alias: i18n.translate('xpack.aiops.logCategorization.filterAliasLabel', {
        defaultMessage: 'Categorization - {field}',
        values: {
          field,
        },
      }),
      index,
      disabled: false,
    },
  };
}
