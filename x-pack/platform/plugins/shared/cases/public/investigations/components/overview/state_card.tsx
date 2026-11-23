/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getDefaultClosingReasonLabel } from '@kbn/response-ops-detections-close-reason';
import { MarkdownRenderer } from '../../../components/markdown_editor';
import { VERDICT_LABELS } from '../../../../common/investigations/types';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useActivity, useItems, useTimings } from '../../hooks';
import { ICONS } from '../../icons';
import type { ModalName } from '../modals/modal_props';
import { formatDuration } from '../shared/formatters';
import { RelativeTime } from '../shared/relative_time';
import * as sharedI18n from '../shared/translations';
import { useNow } from '../shared/use_now';
import type { TabId } from '../tabs/tab_props';
import { OverviewCard } from './overview_card';
import { describeRunningNow, getNextSteps, isEntity, summarizeScope } from './state_summary';
import * as i18n from './translations';

const ACTIVITY_REQUEST = { per_page: 25, sort_order: 'desc' } as const;

const StateCell: React.FC<{
  label: string;
  wide?: boolean;
  testSubj: string;
  children: React.ReactNode;
}> = ({ label, wide = false, testSubj, children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        min-width: 0;
        overflow-wrap: anywhere;
        ${wide ? 'grid-column: 1 / -1;' : ''}
      `}
      data-test-subj={testSubj}
    >
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          text-transform: uppercase;
          font-weight: ${euiTheme.font.weight.semiBold};
          letter-spacing: 0.04em;
          margin-block-end: ${euiTheme.size.xxs};
        `}
      >
        {label}
      </EuiText>
      <EuiText size="s">{children}</EuiText>
    </div>
  );
};
StateCell.displayName = 'StateCell';

export interface StateCardProps {
  record: InvestigationRecord;
  onNavigateTab: (tab: TabId) => void;
  onOpenModal: (name: ModalName) => void;
}

/** A plain-language summary of where the investigation stands and what to do next. */
export const StateCard: React.FC<StateCardProps> = ({ record, onNavigateTab, onOpenModal }) => {
  const { euiTheme } = useEuiTheme();
  const now = useNow();
  const { counters } = record;
  const { data: entityData } = useItems(record.id, {
    kind: ['entity'],
    per_page: INVESTIGATION_LIMITS.maxPerPage,
  });
  const { data: activityData } = useActivity(record.id, ACTIVITY_REQUEST);
  const { data: timings, isError: timingsFailed } = useTimings(record.id);

  const scope = useMemo(
    () => summarizeScope((entityData?.items ?? []).filter(isEntity)),
    [entityData]
  );
  const entries = activityData?.entries ?? [];
  const lastActivity = entries[0];
  const next = getNextSteps(record);
  const claims = counters.claims_by_status;
  const tasksTotal = counters.tasks - counters.tasks_skipped;
  const outcome = record.close_outcome;
  const description = record.summary || record.description;
  const waitingParts = [
    counters.proposals_pending > 0
      ? i18n.WAITING_PROPOSALS(counters.proposals_pending, counters.proposals_pending_disruptive)
      : i18n.WAITING_NO_PROPOSALS,
    counters.claims_needs_review > 0 ? i18n.WAITING_REVIEW(counters.claims_needs_review) : null,
  ].filter((part): part is string => part !== null);

  const link = (label: string, onClick: () => void, testSubj: string) => (
    <EuiLink onClick={onClick} data-test-subj={testSubj}>
      {label}
    </EuiLink>
  );

  return (
    <OverviewCard
      title={i18n.WHERE_THIS_STANDS}
      data-test-subj="investigationStateCard"
      action={
        lastActivity ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="investigationLastActivity">
                {i18n.LAST_ACTIVITY}: {lastActivity.actor.name},{' '}
                <RelativeTime value={lastActivity.ts} />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null
      }
    >
      {outcome ? (
        <EuiPanel
          color="subdued"
          hasShadow={false}
          paddingSize="s"
          css={css`
            margin-block-end: ${euiTheme.size.m};
          `}
          data-test-subj="investigationClosedBar"
        >
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {outcome.human_verdict
                    ? i18n.CLOSED_AS(VERDICT_LABELS[outcome.human_verdict].toLowerCase())
                    : sharedI18n.CLOSED_WITHOUT_VERDICT}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                {sharedI18n.CLOSED_REASON_LINE(getDefaultClosingReasonLabel(outcome.close_reason))}{' '}
                <EuiText component="span" size="xs" color="subdued">
                  {i18n.CLOSED_PRESERVED}
                </EuiText>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType={ICONS.report}
                onClick={() => onOpenModal('report')}
                data-test-subj="investigationClosedBarReport"
              >
                {i18n.GENERATE_REPORT}
              </EuiButton>
            </EuiFlexItem>
            {record.merged_into ? null : (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType={ICONS.refresh}
                  onClick={() => onOpenModal('reopen')}
                  data-test-subj="investigationClosedBarReopen"
                >
                  {i18n.REOPEN}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      ) : null}
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
          gap: ${euiTheme.size.base} ${euiTheme.size.xl};
        `}
      >
        <StateCell label={i18n.WHAT_THIS_IS} wide testSubj="investigationStateWhatThisIs">
          <MarkdownRenderer textSize="s">{description}</MarkdownRenderer>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              {link(
                i18n.ACTIVITY_LINK,
                () => onNavigateTab('activity'),
                'investigationStateTimelineLink'
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </StateCell>
        <StateCell label={i18n.DONE_SO_FAR} testSubj="investigationStateDone">
          {i18n.DONE_SUMMARY(
            counters.evidence,
            counters.claims,
            claims.supported ?? 0,
            claims.open ?? 0,
            claims.blocked ?? 0,
            claims.refuted ?? 0
          )}
        </StateCell>
        <StateCell label={i18n.WAITING_ON_YOU} testSubj="investigationStateWaiting">
          {`${waitingParts.join('. ')}.`}
        </StateCell>
        <StateCell label={i18n.SCOPE} testSubj="investigationStateScope">
          {i18n.SCOPE_SUMMARY(scope.hosts, scope.suspectedHosts, scope.identities)}{' '}
          {scope.highest
            ? i18n.HIGHEST_CRITICALITY(
                scope.highest.criticality,
                scope.highest.name,
                scope.highest.isSuspected
              )
            : i18n.HIGHEST_CRITICALITY_NONE}{' '}
          {link(i18n.SCOPE_GRAPH, () => onNavigateTab('scope'), 'investigationStateScopeLink')}
        </StateCell>
        <StateCell label={i18n.PROCEDURE} testSubj="investigationStateProcedure">
          {counters.tasks === 0
            ? i18n.PROCEDURE_NONE(record.investigation_type)
            : i18n.PROCEDURE_SUMMARY(
                record.investigation_type,
                counters.tasks_done,
                tasksTotal,
                counters.required_tasks_left
              )}{' '}
          {link(
            i18n.PROCEDURE_LINK,
            () => onNavigateTab('procedure'),
            'investigationStateProcedureLink'
          )}
        </StateCell>
        <StateCell label={i18n.RUNNING_NOW} testSubj="investigationStateRunning">
          {describeRunningNow(record, entries, now)}
        </StateCell>
        <StateCell label={i18n.TIMINGS} wide testSubj="investigationStateTimings">
          {timingsFailed ? (
            <EuiText size="s" color="subdued">
              {i18n.TIMINGS_UNAVAILABLE}
            </EuiText>
          ) : (
            <EuiFlexGroup gutterSize="xl" responsive={false} wrap>
              {[
                {
                  id: 'firstResponse',
                  label: i18n.TIME_TO_FIRST_RESPONSE,
                  seconds: timings?.time_to_first_response,
                },
                {
                  id: 'inProgress',
                  label: i18n.TIME_IN_PROGRESS,
                  seconds: timings?.time_in_progress,
                },
                { id: 'toClose', label: i18n.TIME_TO_CLOSE, seconds: timings?.time_to_close },
              ].map(({ id, label, seconds }) => (
                <EuiFlexItem grow={false} key={id}>
                  <EuiText size="xs" color="subdued">
                    {label}
                  </EuiText>
                  <EuiText size="s" data-test-subj={`investigationTiming-${id}`}>
                    {timings ? (
                      <strong>
                        {seconds === null || seconds === undefined
                          ? i18n.TIMING_NOT_YET
                          : formatDuration(seconds * 1000)}
                      </strong>
                    ) : (
                      <EuiLoadingSpinner size="s" />
                    )}
                  </EuiText>
                </EuiFlexItem>
              ))}
              {timings && timings.time_paused > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" data-test-subj="investigationTimingsPaused">
                    {i18n.TIMINGS_EXCLUDES_PAUSED(formatDuration(timings.time_paused * 1000))}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          )}
        </StateCell>
        <StateCell label={i18n.NEXT} wide testSubj="investigationStateNext">
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            {next.map((step, index) => (
              <EuiFlexItem grow={false} key={step}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="primary">{index + 1}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>{step}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </StateCell>
      </div>
    </OverviewCard>
  );
};
StateCard.displayName = 'StateCard';
