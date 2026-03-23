/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiCallOut, EuiPageHeader, EuiSearchBar, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CriteriaWithPagination } from '@elastic/eui';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { RuleApiResponse } from '@kbn/alerting-v2-rule-apis';
import { useFetchRules } from '@kbn/alerting-v2-rule-apis';
import {
  ALERTING_V2_RULE_CREATE_LOCATOR,
  type AlertingV2RuleCreateLocatorParams,
} from '@kbn/deeplinks-alerting-v2';
import { RuleListProvider, useRuleListServices, type RuleListServices } from '../rule_list_context';
import { RulesListTableContainer } from './rules_list_table_container';

const DEFAULT_PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

export interface RuleListProps {
  services: RuleListServices;
  share: SharePluginStart;
  showPageHeader?: boolean;
}

const queryClient = new QueryClient();

export const RuleList = ({ services, share, showPageHeader = true }: RuleListProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <RuleListProvider services={services}>
        <RuleListInner share={share} showPageHeader={showPageHeader} />
      </RuleListProvider>
    </QueryClientProvider>
  );
};

const RuleListInner = ({
  share,
  showPageHeader,
}: {
  share: SharePluginStart;
  showPageHeader: boolean;
}) => {
  const { http, notifications } = useRuleListServices();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, error } = useFetchRules(
    { http, notifications },
    { page, perPage, search: debouncedSearch || undefined }
  );

  const createLocator = share.url.locators.get<AlertingV2RuleCreateLocatorParams>(
    ALERTING_V2_RULE_CREATE_LOCATOR
  );
  const createRuleUrl = createLocator?.useUrl({});

  const onTableChange = ({ page: tablePage }: CriteriaWithPagination<RuleApiResponse>) => {
    setPage(tablePage.index + 1);
    setPerPage(tablePage.size);
  };

  return (
    <div>
      {showPageHeader && (
        <>
          <EuiPageHeader
            pageTitle={
              <FormattedMessage
                id="xpack.alertingV2.rulesList.pageTitle"
                defaultMessage="Alerting V2 Rules"
              />
            }
            rightSideItems={[
              <EuiButton
                key="create-rule"
                href={createRuleUrl || undefined}
                data-test-subj="createRuleButton"
              >
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.createRuleButton"
                  defaultMessage="Create rule"
                />
              </EuiButton>,
            ]}
          />
          <EuiSpacer size="m" />
        </>
      )}
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
            share={share}
          />
        </>
      ) : null}
    </div>
  );
};
