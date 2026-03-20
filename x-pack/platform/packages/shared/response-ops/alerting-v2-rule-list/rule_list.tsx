/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiCallOut, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CriteriaWithPagination } from '@elastic/eui';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import type { RuleApiResponse } from './rules_api';
import { useFetchRules } from './use_fetch_rules';
import {
  RuleListProvider,
  useRuleListServices,
  useRuleListPaths,
  type RuleListServices,
  type RuleListPaths,
} from './rule_list_context';
import { RulesListTableContainer } from './rules_list_table_container';

const DEFAULT_PER_PAGE = 20;

export interface RuleListProps {
  services: RuleListServices;
  paths: RuleListPaths;
  showPageHeader?: boolean;
}

const queryClient = new QueryClient();

export const RuleList = ({ services, paths, showPageHeader = true }: RuleListProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <RuleListProvider services={services} paths={paths}>
        <RuleListInner showPageHeader={showPageHeader} />
      </RuleListProvider>
    </QueryClientProvider>
  );
};

const RuleListInner = ({ showPageHeader }: { showPageHeader: boolean }) => {
  const { http } = useRuleListServices();
  const paths = useRuleListPaths();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const { data, isLoading, isError, error } = useFetchRules({ page, perPage });

  const onTableChange = ({ page: tablePage }: CriteriaWithPagination<RuleApiResponse>) => {
    setPage(tablePage.index + 1);
    setPerPage(tablePage.size);
  };

  return (
    <div>
      {showPageHeader && (
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
              href={http.basePath.prepend(paths.ruleCreate)}
              data-test-subj="createRuleButton"
            >
              <FormattedMessage
                id="xpack.alertingV2.rulesList.createRuleButton"
                defaultMessage="Create rule"
              />
            </EuiButton>,
          ]}
        />
      )}
      {showPageHeader && <EuiSpacer size="m" />}
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
        <RulesListTableContainer
          items={data?.items ?? []}
          totalItemCount={data?.total ?? 0}
          page={page}
          perPage={perPage}
          isLoading={isLoading}
          onTableChange={onTableChange}
        />
      ) : null}
    </div>
  );
};
