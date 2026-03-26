/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiSearchBar, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CriteriaWithPagination } from '@elastic/eui';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { RuleApiResponse } from '../../services/rules_api';
import { useFetchRules } from '../../hooks/use_fetch_rules';
import { RulesListTableContainer } from './rules_list_table_container';

const DEFAULT_PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

export const RulesListContent = () => {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, error } = useFetchRules({
    page,
    perPage,
    search: debouncedSearch || undefined,
  });

  const onTableChange = ({ page: tablePage }: CriteriaWithPagination<RuleApiResponse>) => {
    setPage(tablePage.index + 1);
    setPerPage(tablePage.size);
  };

  return (
    <div>
      {isError ? (
        <>
          <EuiCallOut
            announceOnMount
            title={
              <FormattedMessage
                id="xpack.alertingV2.rulesList.loadErrorTitle"
                defaultMessage="Failed to load rules"
              />
            }
            color="danger"
            iconType="error"
          >
            {error instanceof Error ? error.message : String(error)}
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}
      {!isError ? (
        <>
          <EuiSearchBar
            query={searchInput}
            box={{
              incremental: true,
              placeholder: i18n.translate('xpack.alertingV2.rulesList.searchPlaceholder', {
                defaultMessage: 'Search rules',
              }),
              'data-test-subj': 'rulesListSearchBar',
            }}
            onChange={({ queryText }) => setSearchInput(queryText ?? '')}
          />
          <EuiSpacer size="m" />
          <RulesListTableContainer
            items={data?.items ?? []}
            totalItemCount={data?.total ?? 0}
            page={page}
            perPage={perPage}
            search={debouncedSearch}
            isLoading={isLoading}
            onTableChange={onTableChange}
          />
        </>
      ) : null}
    </div>
  );
};
