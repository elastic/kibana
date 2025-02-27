/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { type Filter, fromKueryExpression, type Query } from '@kbn/es-query';
import { type SearchBarOwnProps } from '@kbn/unified-search-plugin/public/search_bar';
import { EuiSpacer, EuiTextColor } from '@elastic/eui';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import { useDataSource } from '../../hooks/use_data_source';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

export interface SearchBarProps {
  query: Query;
  filters: Filter[];
  onQueryChange: (update: Query) => void;
  onFiltersChange: (update: Filter[]) => void;
}

/**
 * Reusable search bar component for the AIOps app.
 *
 * @param query
 * @param filters
 * @param onQueryChange
 * @param onFiltersChange
 * @constructor
 */
export const SearchBarWrapper: FC<SearchBarProps> = ({
  query,
  filters,
  onQueryChange,
  onFiltersChange,
}) => {
  const { dataView } = useDataSource();
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useAiopsAppContext();

  const [error, setError] = useState<string | undefined>();

  const onQuerySubmit = useCallback<NonNullable<SearchBarOwnProps['onQuerySubmit']>>(
    (payload, isUpdate) => {
      if (payload.query?.language === SEARCH_QUERY_LANGUAGE.KUERY) {
        try {
          // Validates the query
          fromKueryExpression(payload.query.query);
          setError(undefined);
          onQueryChange(payload.query);
        } catch (e) {
          setError(e.message);
        }
      }
    },
    [onQueryChange]
  );

  const onFiltersUpdated = useCallback(
    (updatedFilters: Filter[]) => {
      onFiltersChange(updatedFilters);
    },
    [onFiltersChange]
  );

  const resultQuery = query ?? { query: '', language: 'kuery' };

  return (
    <>
      <SearchBar
        showSubmitButton={false}
        appName={'aiops'}
        showFilterBar
        showDatePicker={false}
        showQueryInput
        query={resultQuery}
        showSavedQueryControls={false}
        filters={filters ?? []}
        onQuerySubmit={onQuerySubmit}
        indexPatterns={[dataView]}
        placeholder={i18n.translate('xpack.aiops.searchPanel.queryBarPlaceholderText', {
          defaultMessage: 'Search… (e.g. status:200 AND extension:"PHP")',
        })}
        displayStyle={'inPage'}
        isClearable
        onFiltersUpdated={onFiltersUpdated}
      />
      {error ? (
        <>
          <EuiSpacer size={'s'} />
          <EuiTextColor color="danger">{error}</EuiTextColor>
        </>
      ) : null}
    </>
  );
};
