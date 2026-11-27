/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { getEffectiveStatuses } from '../../../../common/investigations/statuses';
import {
  useFindRecords,
  useInvestigationBreadcrumbs,
  useInvestigationsNavigation,
  useStatuses,
} from '../../hooks';
import { ICONS } from '../../icons';
import { CreateInvestigationFlyout } from '../create/create_investigation_flyout';
import { EmptyState } from '../shared/empty_state';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import { QueueFilters } from './queue_filters';
import { QueueTable } from './queue_table';
import { QueueBulkActions } from './bulk/bulk_actions';
import { useQueueFields } from './use_queue_fields';
import * as i18n from './translations';
import { hasActiveFilters, toFindRequest, useQueueUrlState } from './use_queue_url_state';

const SETTINGS_PATH = '/settings';

export const QueuePage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { state, update, clearFilters } = useQueueUrlState();
  const { goToRecord, navigate } = useInvestigationsNavigation();
  const { permissions } = useCasesContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useInvestigationBreadcrumbs();

  const { data, error, isLoading, isFetching, isError, refetch } = useFindRecords(
    toFindRequest(state)
  );

  const { fields } = useQueueFields();
  const { data: statusesData } = useStatuses();
  const statuses = useMemo(() => getEffectiveStatuses(statusesData?.statuses), [statusesData]);
  const fieldColumns = useMemo(
    () =>
      state.columns.flatMap((key) => {
        const field = fields.find(({ mirrorKey }) => mirrorKey === key);
        return field ? [field] : [];
      }),
    [fields, state.columns]
  );

  const records = useMemo(() => data?.records ?? [], [data]);
  const total = data?.total ?? 0;
  // The selection is one page of the queue: it keeps only what the page still shows.
  const selected = useMemo(
    () => records.filter(({ id }) => selectedIds.includes(id)),
    [records, selectedIds]
  );
  useEffect(() => {
    setSelectedIds((ids) => {
      const shown = ids.filter((id) => records.some((record) => record.id === id));
      return shown.length === ids.length ? ids : shown;
    });
  }, [records]);
  const filtered = hasActiveFilters(state);

  const settingsButton = (
    <EuiButtonEmpty
      iconType={ICONS.settings}
      onClick={() => navigate(SETTINGS_PATH)}
      data-test-subj="investigationsSettingsButton"
    >
      {i18n.INVESTIGATION_SETTINGS}
    </EuiButtonEmpty>
  );

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
        rightSideItems={[newInvestigationButton, settingsButton]}
        bottomBorder={false}
      />
      <EuiSpacer size="m" />
      <QueueFilters
        state={state}
        onChange={update}
        onClear={clearFilters}
        records={records}
        fields={fields}
        statuses={statuses}
      />
      <EuiSpacer size="m" />
      <QueueBulkActions
        selected={selected}
        statuses={statuses}
        onClear={() => setSelectedIds([])}
      />
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
            statuses={statuses}
            fieldColumns={fieldColumns}
            onChange={update}
            selected={selected}
            onSelectionChange={
              permissions.update ? (next) => setSelectedIds(next.map(({ id }) => id)) : undefined
            }
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
