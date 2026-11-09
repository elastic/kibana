/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { RelatedCaseSummary } from '../../../../../common/types/api';
import type { CaseStatuses } from '../../../../../common/types/domain';
import type { CaseUI } from '../../../../../common/ui/types';
import {
  matchesRelatedFilters,
  type RelatedByReason,
  type RelatedFilters,
} from '../../../../client/case_view_sections';
import { useCaseViewNavigation } from '../../../../common/navigation';
import { useCasesToast } from '../../../../common/use_cases_toast';
import { getRelatedCases, linkCases, unlinkCase } from '../../../../containers/agentic_api';
import { casesQueriesKeys } from '../../../../containers/constants';
import { useGetSimilarCases } from '../../../../containers/use_get_similar_cases';
import { statuses as statusConfig } from '../../../status/config';
import { useCaseStatuses } from '../../../status/use_case_statuses';
import { LinkCasesModal } from './link_cases_modal';
import * as i18n from './translations';

/** Every similar case the Related tab can show; more are left to the Similar cases API's paging. */
const MAX_SIMILAR_READ = 100;

export const relatedCasesQueryKey = (caseId: string) =>
  [...casesQueriesKeys.case(caseId), 'related', 'cases'] as const;

interface RelatedCaseRow {
  id: string;
  title: string;
  incrementalId: number | null;
  status: CaseStatuses;
  statusKey: string | null;
  closeReason: string | null;
  restricted: boolean;
  updatedAt: string | null;
  reasons: RelatedByReason[];
  /** "Observable: fin-ws-07", "Alert: …" */
  reasonLabels: string[];
  linked: boolean;
}

const caseNumber = (row: { incrementalId: number | null; title: string }) =>
  row.incrementalId != null ? i18n.CASE_NUMBER(row.incrementalId) : row.title;

/**
 * Builds the Cases section's rows: linked and alert-sharing cases from the related-cases API, and
 * observable matches from Similar cases (kept as they were). One row per case, with every reason.
 */
export const buildRelatedCaseRows = ({
  caseData,
  related,
  similar,
}: {
  caseData: Pick<CaseUI, 'id' | 'aiVerdict'>;
  related: RelatedCaseSummary[];
  similar: Array<{
    id: string;
    title: string;
    incrementalId?: number | null;
    status: CaseStatuses;
    statusKey?: string | null;
    closeReason?: string | null;
    aiVerdict?: { verdict: string } | null;
    access?: { mode: string } | null;
    updatedAt?: string | null;
    similarities: { observables: Array<{ typeLabel?: string; typeKey: string; value: string }> };
  }>;
}): RelatedCaseRow[] => {
  const rows = new Map<string, RelatedCaseRow>();
  const ownVerdict = caseData.aiVerdict?.verdict ?? null;

  for (const summary of related) {
    rows.set(summary.id, {
      id: summary.id,
      title: summary.title,
      incrementalId: summary.incremental_id,
      status: summary.status as CaseStatuses,
      statusKey: summary.status_key,
      closeReason: summary.close_reason,
      restricted: summary.restricted,
      updatedAt: summary.updated_at,
      reasons: [...summary.reasons],
      reasonLabels: summary.shared_alert_ids.map((id) =>
        i18n.RELATED_BY_WITH_VALUE(i18n.RELATED_BY_LABELS.alert, id)
      ),
      linked: summary.reasons.includes('linked'),
    });
    if (ownVerdict && summary.ai_verdict === ownVerdict) {
      rows.get(summary.id)?.reasons.push('aiVerdict');
    }
  }

  for (const item of similar.filter(({ id }) => id !== caseData.id)) {
    const labels = item.similarities.observables.map(({ value }) =>
      i18n.RELATED_BY_WITH_VALUE(i18n.RELATED_BY_LABELS.observable, value)
    );
    const existing = rows.get(item.id);
    if (existing) {
      existing.reasons.push('observable');
      existing.reasonLabels.push(...labels);
    } else {
      rows.set(item.id, {
        id: item.id,
        title: item.title,
        incrementalId: item.incrementalId ?? null,
        status: item.status,
        statusKey: item.statusKey ?? null,
        closeReason: item.closeReason ?? null,
        restricted: item.access?.mode === 'restricted',
        updatedAt: item.updatedAt ?? null,
        reasons:
          ownVerdict && item.aiVerdict?.verdict === ownVerdict
            ? ['observable', 'aiVerdict']
            : ['observable'],
        reasonLabels: labels,
        linked: false,
      });
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      Number(b.linked) - Number(a.linked) || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
  );
};

interface RelatedCasesSectionProps {
  caseData: CaseUI;
  canUpdate: boolean;
  filters: RelatedFilters;
  /** Reports how many rows passed the filters, for the tab's empty and no-match states. */
  onVisibleCountChange?: (count: number) => void;
}

export const RelatedCasesSection: React.FC<RelatedCasesSectionProps> = ({
  caseData,
  canUpdate,
  filters,
  onVisibleCountChange,
}) => {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useCasesToast();
  const { getCaseViewUrl, navigateToCaseView } = useCaseViewNavigation();
  const { getStatus } = useCaseStatuses();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const related = useQuery({
    queryKey: relatedCasesQueryKey(caseData.id),
    queryFn: ({ signal }) => getRelatedCases(caseData.id, signal),
    staleTime: 30_000,
  });
  const similar = useGetSimilarCases({
    caseId: caseData.id,
    page: 1,
    perPage: MAX_SIMILAR_READ,
    enabled: true,
  });

  const rows = useMemo(
    () =>
      buildRelatedCaseRows({
        caseData,
        related: related.data?.cases ?? [],
        similar: (similar.data?.cases ?? []) as Parameters<
          typeof buildRelatedCaseRows
        >[0]['similar'],
      }),
    [caseData, related.data, similar.data]
  );
  const visibleRows = useMemo(
    () =>
      rows.filter((row) =>
        matchesRelatedFilters({ reasons: row.reasons, isClosed: row.status === 'closed' }, filters)
      ),
    [rows, filters]
  );
  React.useEffect(() => {
    onVisibleCountChange?.(visibleRows.length);
  }, [onVisibleCountChange, visibleRows.length]);

  const onChanged = useCallback(() => {
    queryClient.invalidateQueries(relatedCasesQueryKey(caseData.id));
    queryClient.invalidateQueries(casesQueriesKeys.caseView());
  }, [caseData.id, queryClient]);

  const linkMutation = useMutation({
    mutationFn: (ids: string[]) => linkCases(caseData.id, ids),
    onSuccess: (_, ids) => {
      const target = rows.find(({ id }) => id === ids[0]);
      showSuccessToast(
        ids.length === 1 && target
          ? i18n.CASE_LINKED_TOAST(caseNumber(target))
          : i18n.CASES_LINKED_TOAST(ids.length),
        i18n.CASE_LINKED_TOAST_BODY
      );
      setIsPickerOpen(false);
      onChanged();
    },
    onError: (error: Error) => showErrorToast(error, { title: i18n.LINK_ERROR }),
  });
  const unlinkMutation = useMutation({
    mutationFn: (targetId: string) => unlinkCase(caseData.id, targetId),
    onSuccess: (_, targetId) => {
      const target = rows.find(({ id }) => id === targetId);
      showSuccessToast(
        i18n.CASE_UNLINKED_TOAST(target ? caseNumber(target) : ''),
        i18n.CASE_UNLINKED_TOAST_BODY
      );
      onChanged();
    },
    onError: (error: Error) => showErrorToast(error, { title: i18n.UNLINK_ERROR }),
  });

  const columns: Array<EuiBasicTableColumn<RelatedCaseRow>> = [
    {
      name: i18n.COLUMN_CASE,
      render: (row: RelatedCaseRow) => (
        // The cell content is a flex row: without a zero min-width this block grows to its text
        // and a long title runs under the next columns instead of ending in an ellipsis.
        <div css={{ minWidth: 0, width: '100%' }}>
          <EuiLink
            href={getCaseViewUrl({ detailName: row.id })}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              navigateToCaseView({ detailName: row.id });
            }}
            className="eui-textTruncate"
            css={{ display: 'block', maxWidth: '100%' }}
            title={row.title}
            data-test-subj="related-case-title"
          >
            {row.title}
          </EuiLink>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            {row.restricted ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="default" iconType="lock" data-test-subj="related-case-restricted">
                  {i18n.RESTRICTED_BADGE}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.UPDATED(
                  row.incrementalId != null ? i18n.CASE_NUMBER(row.incrementalId) : '',
                  row.updatedAt ? moment(row.updatedAt).fromNow() : i18n.NONE
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ),
    },
    {
      name: i18n.COLUMN_STATUS,
      width: '8em',
      render: (row: RelatedCaseRow) => {
        const status = getStatus(row.statusKey, row.status);
        return (
          <EuiBadge color={statusConfig[status.category]?.color ?? 'default'}>
            {status.label}
          </EuiBadge>
        );
      },
    },
    {
      name: i18n.COLUMN_CLOSE_REASON,
      width: '9em',
      render: (row: RelatedCaseRow) => row.closeReason ?? i18n.NONE,
    },
    {
      name: i18n.RELATED_BY,
      width: '20%',
      render: (row: RelatedCaseRow) => (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {row.linked ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary" data-test-subj="related-case-linked-badge">
                {i18n.RELATED_BY_LABELS.linked}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          {row.reasonLabels.slice(0, 3).map((label) => (
            <EuiFlexItem grow={false} key={label}>
              <EuiBadge color="hollow">{label}</EuiBadge>
            </EuiFlexItem>
          ))}
          {row.reasons.includes('aiVerdict') && caseData.aiVerdict ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{i18n.RELATED_BY_LABELS.aiVerdict}</EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ),
    },
    ...(canUpdate
      ? [
          {
            name: i18n.COLUMN_ACTIONS,
            width: '96px',
            render: (row: RelatedCaseRow) =>
              row.linked ? (
                <EuiButtonEmpty
                  size="xs"
                  color="danger"
                  isLoading={unlinkMutation.isLoading && unlinkMutation.variables === row.id}
                  onClick={() => unlinkMutation.mutate(row.id)}
                  data-test-subj={`related-case-unlink-${row.id}`}
                >
                  {i18n.UNLINK}
                </EuiButtonEmpty>
              ) : (
                <EuiButtonEmpty
                  size="xs"
                  isLoading={
                    linkMutation.isLoading && (linkMutation.variables ?? []).includes(row.id)
                  }
                  onClick={() => linkMutation.mutate([row.id])}
                  data-test-subj={`related-case-link-${row.id}`}
                >
                  {i18n.LINK}
                </EuiButtonEmpty>
              ),
          } as EuiBasicTableColumn<RelatedCaseRow>,
        ]
      : []),
  ];

  const isLoading = related.isLoading || similar.isLoading;
  const inaccessible = related.data?.inaccessible_linked_count ?? 0;

  return (
    <div data-test-subj="related-cases-section">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{i18n.CASES_TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {canUpdate ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="link"
              onClick={() => setIsPickerOpen(true)}
              data-test-subj="related-link-case-button"
            >
              {i18n.LINK_CASE}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {related.isError ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          title={i18n.ERROR_TITLE}
          data-test-subj="related-cases-error"
        >
          <p>{i18n.ERROR_BODY}</p>
          <EuiButton size="s" color="danger" onClick={() => related.refetch()}>
            {i18n.RETRY}
          </EuiButton>
        </EuiCallOut>
      ) : isLoading ? (
        <EuiSkeletonText lines={3} />
      ) : (
        <EuiBasicTable
          tableCaption={i18n.CASES_TITLE}
          items={visibleRows}
          columns={columns}
          tableLayout="fixed"
          rowProps={(row: RelatedCaseRow) => ({ 'data-test-subj': `related-case-row-${row.id}` })}
          noItemsMessage={rows.length > 0 ? i18n.NO_MATCHES_TITLE : i18n.EMPTY_TITLE}
          data-test-subj="related-cases-table"
        />
      )}
      {inaccessible > 0 ? (
        <EuiText size="xs" color="subdued" data-test-subj="related-cases-inaccessible">
          <EuiSpacer size="xs" />
          <EuiIcon type="lock" size="s" aria-hidden={true} />{' '}
          {i18n.INACCESSIBLE_LINKED(inaccessible)}
        </EuiText>
      ) : null}
      {isPickerOpen ? (
        <LinkCasesModal
          caseData={caseData}
          excludeIds={rows.filter(({ linked }) => linked).map(({ id }) => id)}
          isSubmitting={linkMutation.isLoading}
          onCancel={() => setIsPickerOpen(false)}
          onSubmit={(ids) => linkMutation.mutate(ids)}
        />
      ) : null}
    </div>
  );
};
RelatedCasesSection.displayName = 'RelatedCasesSection';
