/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEFAULT_CLOSING_REASON_OPTIONS } from '@kbn/response-ops-detections-close-reason';
import type { CaseUI } from '../../../../../common';
import type { PriorOutcomesResponse } from '../../../../../common/knowledge/types';
import { useCasesConfig } from '../../../../common/lib/kibana';
import { useCaseViewNavigation } from '../../../../common/navigation';
import { useGetPriorOutcomes } from '../../../../containers/use_get_prior_outcomes';
import { FormattedRelativePreferenceDate } from '../../../formatted_date';

const LIST_ID = 'case-view-prior-outcomes-list';

const closeReasonLabel = (reason: string) =>
  DEFAULT_CLOSING_REASON_OPTIONS.find(({ key }) => key === reason)?.label ?? reason;

const TITLE = i18n.translate('xpack.cases.caseView.priorOutcomes.title', {
  defaultMessage: 'Prior outcomes:',
});
const linkText = (count: number, reason: string | undefined, allSameReason: boolean) =>
  reason == null
    ? i18n.translate('xpack.cases.caseView.priorOutcomes.linkNoReason', {
        defaultMessage:
          '{count, plural, one {# similar closed case} other {# similar closed cases}}',
        values: { count },
      })
    : allSameReason
    ? i18n.translate('xpack.cases.caseView.priorOutcomes.link', {
        defaultMessage:
          '{count, plural, one {# similar case} other {# similar cases}} closed as {reason}',
        values: { count, reason: closeReasonLabel(reason).toLowerCase() },
      })
    : i18n.translate('xpack.cases.caseView.priorOutcomes.linkMostly', {
        defaultMessage: '{count} similar closed cases, most as {reason}',
        values: { count, reason: closeReasonLabel(reason).toLowerCase() },
      });
const reasonCount = (count: number, reason: string) =>
  i18n.translate('xpack.cases.caseView.priorOutcomes.reasonCount', {
    defaultMessage: '{count} {reason}',
    values: { count, reason: closeReasonLabel(reason).toLowerCase() },
  });
const none = (days: number) =>
  i18n.translate('xpack.cases.caseView.priorOutcomes.none', {
    defaultMessage: 'No similar closed cases in the last {days} days',
    values: { days },
  });
const tooltip = (days: number) =>
  i18n.translate('xpack.cases.caseView.priorOutcomes.tooltip', {
    defaultMessage:
      "Closed cases published to the cases-outcomes knowledge index that share this case's rules, hosts, users, or observables, in the last {days} days. Restricted cases are never included.",
    values: { days },
  });
const CLOSED = i18n.translate('xpack.cases.caseView.priorOutcomes.closed', {
  defaultMessage: 'Closed',
});
const caseLabel = (incrementalId: number | undefined, title: string) =>
  incrementalId != null ? `#${incrementalId} ${title}` : title;

type AvailableOutcomes = Extract<PriorOutcomesResponse, { available: true }>;

const mostCommonReason = (closeReasons: Record<string, number>) =>
  Object.entries(closeReasons).sort(([, a], [, b]) => b - a)[0]?.[0];

const PriorOutcomesList: React.FC<{ data: AvailableOutcomes }> = ({ data }) => {
  const { getCaseViewUrl, navigateToCaseView } = useCaseViewNavigation();
  const reasons = Object.entries(data.close_reasons).sort(([, a], [, b]) => b - a);

  return (
    <div id={LIST_ID} data-test-subj="case-view-prior-outcomes-list">
      <EuiSpacer size="xs" />
      {reasons.length > 1 ? (
        <EuiText size="xs" color="subdued" data-test-subj="case-view-prior-outcomes-split">
          {reasons.map(([reason, count]) => reasonCount(count, reason)).join(' · ')}
        </EuiText>
      ) : null}
      {data.outcomes.map((outcome) => (
        <EuiFlexGroup
          key={outcome.case_id}
          gutterSize="s"
          alignItems="center"
          responsive={false}
          wrap
          data-test-subj="case-view-prior-outcome"
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <EuiLink
                href={getCaseViewUrl({ detailName: outcome.case_id })}
                onClick={(event: React.MouseEvent) => {
                  event.preventDefault();
                  navigateToCaseView({ detailName: outcome.case_id });
                }}
                data-test-subj="case-view-prior-outcome-link"
              >
                {caseLabel(outcome.incremental_id, outcome.title)}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
          {outcome.close_reason ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{closeReasonLabel(outcome.close_reason)}</EuiBadge>
            </EuiFlexItem>
          ) : null}
          {outcome.closed_at ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {CLOSED} <FormattedRelativePreferenceDate value={outcome.closed_at} />
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ))}
    </div>
  );
};
PriorOutcomesList.displayName = 'PriorOutcomesList';

/**
 * What analysts decided on similar closed cases, from the context engine. A hint, never a
 * blocker: hidden when the context engine is off, the caller can't read it, or the read fails.
 */
export const PriorOutcomes: React.FC<{ caseData: CaseUI }> = ({ caseData }) => {
  const { knowledgeEnabled } = useCasesConfig();
  const { data, isLoading, isError } = useGetPriorOutcomes(caseData.id, {
    enabled: knowledgeEnabled,
  });
  const [isOpen, setIsOpen] = useState(false);

  if (!knowledgeEnabled || isError || (data != null && !data.available)) {
    return null;
  }
  if (isLoading || data == null) {
    return (
      <EuiSkeletonText lines={1} size="xs" data-test-subj="case-view-prior-outcomes-loading" />
    );
  }
  if (!data.available) {
    return null;
  }

  return (
    <div data-test-subj="case-view-prior-outcomes">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong>{TITLE}</strong>{' '}
            {data.outcomes.length === 0 ? (
              <EuiText
                size="xs"
                color="subdued"
                component="span"
                data-test-subj="case-view-prior-outcomes-none"
              >
                {none(data.days)}
              </EuiText>
            ) : (
              <EuiLink
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                aria-controls={LIST_ID}
                data-test-subj="case-view-prior-outcomes-toggle"
              >
                {linkText(
                  data.total,
                  mostCommonReason(data.close_reasons),
                  Object.keys(data.close_reasons).length === 1 &&
                    Object.values(data.close_reasons)[0] === data.total
                )}
              </EuiLink>
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tooltip(data.days)} type="info" size="s" color="subdued" />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isOpen && data.outcomes.length > 0 ? <PriorOutcomesList data={data} /> : null}
    </div>
  );
};
PriorOutcomes.displayName = 'PriorOutcomes';
