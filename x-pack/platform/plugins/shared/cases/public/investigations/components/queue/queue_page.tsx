/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiPageHeader, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import {
  useFindRecords,
  useInvestigationBreadcrumbs,
  useInvestigationsNavigation,
} from '../../hooks';
import { ICONS } from '../../icons';
import { CreateInvestigationFlyout } from '../create/create_investigation_flyout';
import { EmptyState } from '../shared/empty_state';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import { QueueFilters } from './queue_filters';
import { QueueTable } from './queue_table';
import * as i18n from './translations';
import { hasActiveFilters, toFindRequest, useQueueUrlState } from './use_queue_url_state';

export const QueuePage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { state, update, clearFilters } = useQueueUrlState();
  const { goToRecord } = useInvestigationsNavigation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useInvestigationBreadcrumbs();

  const { data, error, isLoading, isFetching, isError, refetch } = useFindRecords(
    toFindRequest(state)
  );

  const records = data?.records ?? [];
  const total = data?.total ?? 0;
  const filtered = hasActiveFilters(state);

  const newInvestigationButton = (
    <EuiButton
      fill
      iconType={ICONS.add}
      onClick={() => setIsCreateOpen(true)}
      data-test-subj="investigationsNewInvestigation"
    >
      {i18n.NEW_INVESTIGATION}
    </EuiButton>
  );

  const noItemsMessage = filtered ? (
    <EmptyState
      iconType={ICONS.search}
      title={i18n.NO_RESULTS_TITLE}
      body={i18n.NO_RESULTS_BODY}
      actions={
        <EuiButton onClick={clearFilters} data-test-subj="investigationsNoResultsClear">
          {i18n.CLEAR_FILTERS}
        </EuiButton>
      }
      data-test-subj="investigationsNoResults"
    />
  ) : (
    <EmptyState
      iconType={ICONS.investigation}
      title={i18n.EMPTY_TITLE}
      body={i18n.EMPTY_BODY}
      actions={newInvestigationButton}
      data-test-subj="investigationsEmpty"
    />
  );

  const from = total === 0 ? 0 : state.pageIndex * state.pageSize + 1;
  const to = Math.min(total, from + records.length - 1);

  return (
    <div
      css={css`
        height: 100%;
        overflow-y: auto;
        padding: ${euiTheme.size.l};
      `}
      data-test-subj="investigationsQueuePage"
    >
      <EuiPageHeader
        pageTitle={i18n.PAGE_TITLE}
        description={i18n.PAGE_DESCRIPTION}
        rightSideItems={[newInvestigationButton]}
        bottomBorder={false}
      />
      <EuiSpacer size="m" />
      <QueueFilters state={state} onChange={update} onClear={clearFilters} records={records} />
      <EuiSpacer size="m" />
      {isError ? (
        <ErrorState title={i18n.ERROR_TITLE} error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <LoadingState label={i18n.LOADING} />
      ) : (
        <>
          {total > 0 ? (
            <EuiText size="xs" color="subdued" data-test-subj="investigationsQueueSummary">
              {i18n.SHOWING(from, to, total)}
              {total > INVESTIGATION_LIMITS.maxDeepPageFrom
                ? ` ${i18n.RESULT_CAP(INVESTIGATION_LIMITS.maxDeepPageFrom)}`
                : ''}
            </EuiText>
          ) : null}
          <EuiSpacer size="s" />
          <QueueTable
            records={records}
            total={total}
            state={state}
            isLoading={isFetching}
            noItemsMessage={noItemsMessage}
            onChange={update}
          />
        </>
      )}
      {isCreateOpen ? (
        <CreateInvestigationFlyout
          onClose={() => setIsCreateOpen(false)}
          onCreated={(recordId) => {
            setIsCreateOpen(false);
            goToRecord(recordId);
          }}
        />
      ) : null}
    </div>
  );
};
QueuePage.displayName = 'QueuePage';
