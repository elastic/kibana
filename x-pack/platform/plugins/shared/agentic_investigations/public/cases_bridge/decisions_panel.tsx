/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import moment from 'moment';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTextBlockTruncate,
  EuiTitle,
} from '@elastic/eui';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CaseViewSectionProps } from '@kbn/cases-plugin/public';
import { PROPOSALS_UI_CAPABILITY_DECIDE } from '@kbn/proposals-common';
import type {
  CaseDecision,
  CaseDecisionPerson,
  CaseDecisionsResponse,
} from '../../common/cases_bridge';
import { decideOnCase, fetchCaseDecisions } from './api';
import { DECISIONS } from './translations';

const nameOf = (person?: CaseDecisionPerson): string =>
  person?.full_name || person?.username || DECISIONS.someone;

const fromNow = (time?: string): string => (time ? moment(time).fromNow() : '');

const decidedLine = (decision: CaseDecision): string => {
  if (decision.decision === 'approved') {
    return DECISIONS.approvedBy(nameOf(decision.decided_by), fromNow(decision.decided_at));
  }
  if (decision.decision === 'dismissed') {
    return DECISIONS.dismissedBy(nameOf(decision.decided_by), fromNow(decision.decided_at));
  }
  if (decision.status === 'deciding') {
    return DECISIONS.deciding;
  }
  return DECISIONS.expired(fromNow(decision.decided_at));
};

export const caseDecisionsQueryKey = (caseId: string) => ['cases-bridge', 'decisions', caseId];

/**
 * The decisions a Worker's investigation raised, on its case (Phase 5). Approve and Dismiss go
 * through one bridge route that checks the proposal belongs to this case, releases the proposal's
 * gate as the clicker, and writes the case's Activity row.
 */
export const DecisionsPanel: React.FC<CaseViewSectionProps> = ({
  caseData,
  canUpdate,
  refreshCase,
}) => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();
  const [inFlight, setInFlight] = useState<{ id: string; decision: 'approve' | 'dismiss' }>();
  const canDecideInBrowser =
    canUpdate &&
    services.application.capabilities.proposals?.[PROPOSALS_UI_CAPABILITY_DECIDE] === true;

  const { data, isLoading, isError } = useQuery<CaseDecisionsResponse>({
    queryKey: caseDecisionsQueryKey(caseData.id),
    queryFn: ({ signal }) => fetchCaseDecisions(services.http, caseData.id, signal),
  });

  const onDecide = useCallback(
    async (decision: CaseDecision, choice: 'approve' | 'dismiss') => {
      setInFlight({ id: decision.proposal_id, decision: choice });
      try {
        const next = await decideOnCase(services.http, caseData.id, decision.proposal_id, choice);
        queryClient.setQueryData(caseDecisionsQueryKey(caseData.id), next);
        services.notifications.toasts.addSuccess(
          choice === 'approve' ? DECISIONS.approved : DECISIONS.dismissed
        );
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

  const pending = data?.decisions.filter(({ status }) => status === 'pending') ?? [];
  const decided = data?.decisions.filter(({ status }) => status !== 'pending') ?? [];
  const canDecide = canDecideInBrowser && data?.can_decide === true;

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="case-view-decisions">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{DECISIONS.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {pending.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning" data-test-subj="case-view-decisions-pending">
              {DECISIONS.pendingBadge(pending.length)}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      {isLoading && <EuiSkeletonText lines={2} />}
      {isError && (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          size="s"
          title={DECISIONS.loadError}
        />
      )}

      {data && (
        <>
          {pending.length === 0 && (
            <EuiText size="s" color="subdued" data-test-subj="case-view-decisions-none">
              {DECISIONS.none}
            </EuiText>
          )}
          {pending.map((decision, index) => (
            <React.Fragment key={decision.proposal_id}>
              {index > 0 && <EuiHorizontalRule margin="s" />}
              <EuiFlexGroup
                gutterSize="m"
                alignItems="flexStart"
                data-test-subj={`case-view-decision-${decision.proposal_id}`}
              >
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <strong>{decision.title}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    {decision.category && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{decision.category}</EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  {decision.comment && (
                    <EuiTextBlockTruncate lines={3}>
                      <EuiMarkdownFormat textSize="s">{decision.comment}</EuiMarkdownFormat>
                    </EuiTextBlockTruncate>
                  )}
                  <EuiText size="xs" color="subdued">
                    {DECISIONS.proposedBy(
                      nameOf(decision.created_by),
                      fromNow(decision.created_at)
                    )}
                  </EuiText>
                </EuiFlexItem>
                {canDecide && (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="s"
                          aria-label={DECISIONS.dismissAriaLabel(decision.title)}
                          isLoading={
                            inFlight?.id === decision.proposal_id && inFlight.decision === 'dismiss'
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
                            inFlight?.id === decision.proposal_id && inFlight.decision === 'approve'
                          }
                          isDisabled={inFlight !== undefined}
                          onClick={() => onDecide(decision, 'approve')}
                          data-test-subj={`case-view-decision-approve-${decision.proposal_id}`}
                        >
                          {DECISIONS.approve}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </React.Fragment>
          ))}
          {pending.length > 0 && !canDecide && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued" data-test-subj="case-view-decisions-no-privilege">
                {DECISIONS.noPrivilege}
              </EuiText>
            </>
          )}
          {decided.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiAccordion
                id={`case-view-decisions-decided-${caseData.id}`}
                buttonContent={DECISIONS.decidedCount(decided.length)}
                data-test-subj="case-view-decisions-decided"
              >
                <EuiSpacer size="s" />
                {decided.map((decision) => (
                  <EuiText
                    size="s"
                    key={decision.proposal_id}
                    data-test-subj={`case-view-decided-${decision.proposal_id}`}
                  >
                    <p>
                      <strong>{decision.title}</strong>
                      <br />
                      <span>{decidedLine(decision)}</span>
                    </p>
                  </EuiText>
                ))}
              </EuiAccordion>
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};
