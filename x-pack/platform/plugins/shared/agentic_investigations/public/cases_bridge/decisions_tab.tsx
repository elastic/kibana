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
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiMarkdownFormat,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { CaseViewSectionProps } from '@kbn/cases-plugin/public';
import { PROPOSALS_UI_CAPABILITY_DECIDE } from '@kbn/proposals-common';
import type {
  CaseDecision,
  CaseDecisionPerson,
  CaseDecisionsResponse,
} from '../../common/cases_bridge';
import { decideOnCase, fetchCaseDecisions } from './api';
import { DECISIONS_TAB_ID, getLinkedInvestigations } from './case_data';
import { DECISIONS } from './translations';

type View = 'pending' | 'decided';

const PAGE_SIZES = [20, 50, 100];

const nameOf = (person?: CaseDecisionPerson): string =>
  person?.full_name || person?.username || DECISIONS.someone;

const When: React.FC<{ time?: string }> = ({ time }) =>
  time ? (
    <EuiToolTip content={moment(time).format('LLL')}>
      <span tabIndex={0}>{moment(time).fromNow()}</span>
    </EuiToolTip>
  ) : (
    <>{'—'}</>
  );

const OUTCOME: Record<string, { label: string; color: string }> = {
  approved: { label: DECISIONS.outcomeApproved, color: 'success' },
  dismissed: { label: DECISIONS.outcomeDismissed, color: 'default' },
  expired: { label: DECISIONS.outcomeExpired, color: 'hollow' },
  deciding: { label: DECISIONS.outcomeDeciding, color: 'primary' },
  failed: { label: DECISIONS.outcomeFailed, color: 'danger' },
};

const outcomeOf = (decision: CaseDecision) =>
  OUTCOME[decision.decision ?? decision.status] ?? OUTCOME.expired;

/** Every query of the tab starts with this, so a decision refreshes all of them. */
export const caseDecisionsQueryKey = (caseId: string) => ['cases-bridge', 'decisions', caseId];

export const DecisionsTab: React.FC<CaseViewSectionProps> = ({
  caseData,
  canUpdate,
  refreshCase,
}) => {
  const { services } = useKibana<CoreStart & { agentBuilder?: AgentBuilderPluginStart }>();
  const queryClient = useQueryClient();
  // Decided first only when the case says nothing waits; an uncounted case opens on Pending.
  const [view, setView] = useState<View>(caseData.pendingDecisions === 0 ? 'decided' : 'pending');
  const [search, setSearch] = useState('');
  const [investigationId, setInvestigationId] = useState('');
  const [page, setPage] = useState({ index: 0, size: PAGE_SIZES[0] });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [inFlight, setInFlight] = useState<{ id: string; decision: 'approve' | 'dismiss' }>();

  const investigations = useMemo(() => getLinkedInvestigations(caseData), [caseData]);
  const investigationTitles = useMemo(
    () => new Map(investigations.map(({ id, title }) => [id, title])),
    [investigations]
  );

  const query = {
    status: view,
    page: page.index + 1,
    per_page: page.size,
    search: search || undefined,
    investigation_id: investigationId || undefined,
  };
  const { data, isLoading, isFetching, isError, refetch } = useQuery<CaseDecisionsResponse>({
    queryKey: [...caseDecisionsQueryKey(caseData.id), query],
    queryFn: ({ signal }) => fetchCaseDecisions(services.http, caseData.id, query, signal),
    keepPreviousData: true,
  });

  const canDecide =
    canUpdate &&
    services.application.capabilities.proposals?.[PROPOSALS_UI_CAPABILITY_DECIDE] === true &&
    data?.can_decide === true;

  const resetPage = () => setPage((current) => ({ ...current, index: 0 }));

  const onDecide = useCallback(
    async (decision: CaseDecision, choice: 'approve' | 'dismiss') => {
      setInFlight({ id: decision.proposal_id, decision: choice });
      try {
        await decideOnCase(services.http, caseData.id, decision.proposal_id, choice);
        services.notifications.toasts.addSuccess(
          choice === 'approve' ? DECISIONS.approved : DECISIONS.dismissed
        );
        await queryClient.invalidateQueries({ queryKey: caseDecisionsQueryKey(caseData.id) });
        refreshCase();
      } catch (error) {
        services.notifications.toasts.addError(
          error instanceof Error ? error : new Error(String(error)),
          {
            title:
              choice === 'approve'
                ? DECISIONS.approveError(decision.title)
                : DECISIONS.dismissError(decision.title),
          }
        );
      } finally {
        setInFlight(undefined);
      }
    },
    [services, caseData.id, queryClient, refreshCase]
  );

  const decisionColumn: EuiBasicTableColumn<CaseDecision> = {
    name: DECISIONS.columnDecision,
    render: (decision: CaseDecision) => {
      const isExpanded = expanded[decision.proposal_id] === true;
      return (
        // Table cell content is a flex row: without a zero min-width and full width here, the
        // truncated title and comment run under the next columns instead of ending in an ellipsis.
        <EuiFlexGroup
          gutterSize="s"
          alignItems="flexStart"
          responsive={false}
          css={{ minWidth: 0, width: '100%' }}
        >
          {decision.comment ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  isExpanded
                    ? DECISIONS.hideComment(decision.title)
                    : DECISIONS.showComment(decision.title)
                }
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded
                      ? DECISIONS.hideComment(decision.title)
                      : DECISIONS.showComment(decision.title)
                  }
                  onClick={() =>
                    setExpanded((current) => ({ ...current, [decision.proposal_id]: !isExpanded }))
                  }
                  data-test-subj={`case-view-decision-expand-${decision.proposal_id}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
          {/* A flex child needs a zero min-width for the truncation inside it to apply. */}
          <EuiFlexItem css={{ minWidth: 0 }}>
            <EuiText size="s" className="eui-textTruncate" title={decision.title}>
              <strong>{decision.title}</strong>
            </EuiText>
            {decision.comment ? (
              <EuiText size="xs" color="subdued" className="eui-textTruncate">
                {decision.comment.split('\n')[0]}
              </EuiText>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
  };

  const investigationColumn: EuiBasicTableColumn<CaseDecision> = {
    name: DECISIONS.columnInvestigation,
    width: '20%',
    render: (decision: CaseDecision) => {
      const title = decision.investigation_id
        ? investigationTitles.get(decision.investigation_id)
        : undefined;
      if (!decision.investigation_id || !investigationTitles.has(decision.investigation_id)) {
        return (
          <EuiText size="xs" color="subdued">
            {DECISIONS.investigationUnavailable}
          </EuiText>
        );
      }
      const label = title || DECISIONS.columnInvestigation;
      return (
        <div css={{ minWidth: 0, width: '100%' }}>
          <EuiLink
            className="eui-textTruncate"
            css={{ display: 'block', maxWidth: '100%' }}
            title={label}
            onClick={() =>
              services.agentBuilder?.openConversationDetails({
                conversationId: decision.investigation_id as string,
              })
            }
          >
            {label}
          </EuiLink>
        </div>
      );
    },
  };

  const columns: Array<EuiBasicTableColumn<CaseDecision>> =
    view === 'pending'
      ? [
          decisionColumn,
          investigationColumn,
          {
            name: DECISIONS.columnCategory,
            width: '8em',
            render: (decision: CaseDecision) =>
              decision.category ? <EuiBadge color="hollow">{decision.category}</EuiBadge> : '—',
          },
          {
            name: DECISIONS.columnProposed,
            width: '10em',
            render: (decision: CaseDecision) => (
              <EuiText size="xs" css={{ minWidth: 0, width: '100%' }}>
                <div className="eui-textTruncate">
                  {DECISIONS.proposedByName(nameOf(decision.created_by))}
                </div>
                <div className="eui-textTruncate">
                  <EuiText size="xs" color="subdued" component="span">
                    <When time={decision.created_at} />
                  </EuiText>
                </div>
              </EuiText>
            ),
          },
          ...(canDecide
            ? [
                {
                  name: DECISIONS.columnActions,
                  align: 'right' as const,
                  width: '13em',
                  render: (decision: CaseDecision) =>
                    decision.status === 'deciding' ? (
                      <EuiBadge color="primary">{DECISIONS.outcomeDeciding}</EuiBadge>
                    ) : (
                      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            size="s"
                            aria-label={DECISIONS.dismissAriaLabel(decision.title)}
                            isLoading={
                              inFlight?.id === decision.proposal_id &&
                              inFlight.decision === 'dismiss'
                            }
                            isDisabled={inFlight !== undefined}
                            onClick={() => onDecide(decision, 'dismiss')}
                            data-test-subj={`case-view-decision-dismiss-${decision.proposal_id}`}
                          >
                            {DECISIONS.dismiss}
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            size="s"
                            fill
                            aria-label={DECISIONS.approveAriaLabel(decision.title)}
                            isLoading={
                              inFlight?.id === decision.proposal_id &&
                              inFlight.decision === 'approve'
                            }
                            isDisabled={inFlight !== undefined}
                            onClick={() => onDecide(decision, 'approve')}
                            data-test-subj={`case-view-decision-approve-${decision.proposal_id}`}
                          >
                            {DECISIONS.approve}
                          </EuiButton>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ),
                },
              ]
            : []),
        ]
      : [
          decisionColumn,
          investigationColumn,
          {
            name: DECISIONS.columnOutcome,
            width: '8em',
            render: (decision: CaseDecision) => {
              const outcome = outcomeOf(decision);
              return (
                <EuiBadge
                  color={outcome.color}
                  data-test-subj={`case-view-decided-${decision.proposal_id}`}
                >
                  {outcome.label}
                </EuiBadge>
              );
            },
          },
          {
            name: DECISIONS.columnDecidedBy,
            width: '10em',
            render: (decision: CaseDecision) => (
              <EuiText size="xs" className="eui-textTruncate" css={{ minWidth: 0, width: '100%' }}>
                {decision.decided_by ? nameOf(decision.decided_by) : '—'}
              </EuiText>
            ),
          },
          {
            name: DECISIONS.columnDecided,
            width: '8em',
            render: (decision: CaseDecision) => (
              <EuiText size="xs">
                <When time={decision.decided_at} />
              </EuiText>
            ),
          },
        ];

  const itemIdToExpandedRowMap = Object.fromEntries(
    (data?.decisions ?? [])
      .filter(({ proposal_id: id, comment }) => expanded[id] && comment)
      .map((decision) => [
        decision.proposal_id,
        <EuiMarkdownFormat textSize="s">{decision.comment ?? ''}</EuiMarkdownFormat>,
      ])
  );

  const isFiltered = search !== '' || investigationId !== '';
  const noItemsMessage = isFiltered ? (
    DECISIONS.noMatches
  ) : view === 'pending' ? (
    <EuiText size="s" color="subdued" data-test-subj="case-view-decisions-none">
      {DECISIONS.nothingWaiting}{' '}
      {(data?.decided ?? 0) > 0 && (
        <EuiLink
          onClick={() => {
            setView('decided');
            resetPage();
          }}
        >
          {DECISIONS.viewDecided(data?.decided ?? 0)}
        </EuiLink>
      )}
    </EuiText>
  ) : (
    DECISIONS.noDecisions
  );

  return (
    <div data-test-subj="case-view-decisions">
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={DECISIONS.toggleLegend}
            buttonSize="compressed"
            idSelected={view}
            onChange={(id) => {
              setView(id as View);
              resetPage();
            }}
            options={[
              {
                id: 'pending',
                label: DECISIONS.pendingToggle(data?.pending ?? 0),
                'data-test-subj': 'case-view-decisions-pending',
              },
              {
                id: 'decided',
                label: DECISIONS.decidedToggle(data?.decided ?? 0),
                'data-test-subj': 'case-view-decisions-decided',
              },
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 200 }}>
          <EuiFieldSearch
            compressed
            fullWidth
            placeholder={DECISIONS.searchPlaceholder}
            aria-label={DECISIONS.searchPlaceholder}
            incremental={false}
            onSearch={(value) => {
              setSearch(value.trim());
              resetPage();
            }}
            data-test-subj="case-view-decisions-search"
          />
        </EuiFlexItem>
        {investigations.length > 1 && (
          <EuiFlexItem grow={false}>
            <EuiSelect
              compressed
              aria-label={DECISIONS.investigationFilter}
              prepend={DECISIONS.investigationFilter}
              value={investigationId}
              onChange={(event) => {
                setInvestigationId(event.target.value);
                resetPage();
              }}
              options={[
                { value: '', text: DECISIONS.allInvestigations },
                ...investigations.map(({ id, title }) => ({
                  value: id,
                  text: title || DECISIONS.columnInvestigation,
                })),
              ]}
              data-test-subj="case-view-decisions-investigation"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {data && view === 'pending' && data.pending > 0 && !canDecide && (
        <>
          <EuiText size="xs" color="subdued" data-test-subj="case-view-decisions-no-privilege">
            {DECISIONS.noPrivilege}
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      {isError ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          size="s"
          title={DECISIONS.loadError}
          data-test-subj="case-view-decisions-error"
        >
          <EuiButton size="s" color="danger" onClick={() => refetch()}>
            {DECISIONS.retry}
          </EuiButton>
        </EuiCallOut>
      ) : isLoading ? (
        <EuiSkeletonText lines={3} />
      ) : (
        <EuiBasicTable<CaseDecision>
          tableCaption={DECISIONS.title}
          tableLayout="fixed"
          items={data?.decisions ?? []}
          itemId="proposal_id"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          columns={columns}
          loading={isFetching}
          noItemsMessage={noItemsMessage}
          rowProps={(decision) => ({
            'data-test-subj': `case-view-decision-${decision.proposal_id}`,
          })}
          pagination={{
            pageIndex: page.index,
            pageSize: page.size,
            totalItemCount: data?.total ?? 0,
            pageSizeOptions: PAGE_SIZES,
          }}
          onChange={({ page: next }: CriteriaWithPagination<CaseDecision>) =>
            setPage({ index: next.index, size: next.size })
          }
          data-test-subj="case-view-decisions-table"
        />
      )}
    </div>
  );
};

/**
 * The one line above the tabs while decisions wait. The list lives in the Decisions tab, so the
 * page above the tabs never grows with the number of decisions.
 */
export const DecisionsNotice: React.FC<CaseViewSectionProps> = ({ caseData, openTab }) => {
  const count = caseData.pendingDecisions ?? 0;
  if (count === 0) return null;
  return (
    <EuiCallOut
      size="s"
      color="warning"
      iconType="clock"
      data-test-subj="case-view-decisions-notice"
      title={
        <>
          {DECISIONS.noticeWaiting(count)}{' '}
          <EuiLink
            onClick={() => openTab?.(DECISIONS_TAB_ID)}
            data-test-subj="case-view-decisions-review"
          >
            {DECISIONS.reviewDecisions}
          </EuiLink>
        </>
      }
    />
  );
};
