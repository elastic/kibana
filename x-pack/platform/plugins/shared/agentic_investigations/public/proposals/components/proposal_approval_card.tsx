/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { ApprovalContent } from '@kbn/agentic-investigations-common';
import type { ApprovalAction } from '@kbn/agentic-investigations-common';
import { isAwaitingDecision } from '../../../common';
import { PROPOSAL_WITHOUT_ACTION_LABEL } from '../translations';
import type { DismissReason, ProposalDecision } from '../../../common';
import { toBlastRadiusItems } from '../attachments/to_blast_radius_items';
import { useApproveProposal, useDismissProposal, useProposal } from '../hooks/use_proposals_api';
import { ProposalDismissForm } from './proposal_dismiss_form';

type CardMode = 'view' | 'dismissing';

/** What the analyst concluded, which is separate from how far it then got. */
const DECISION_LABELS: Record<ProposalDecision, string> = {
  approved: i18n.translate('xpack.agenticInvestigations.proposalCard.decision.approved', {
    defaultMessage: 'approved',
  }),
  dismissed: i18n.translate('xpack.agenticInvestigations.proposalCard.decision.dismissed', {
    defaultMessage: 'dismissed',
  }),
};

type ErrorCallout =
  | { type: 'conflict'; message: string }
  | { type: 'expired'; message: string }
  | { type: 'error'; message: string };

const mapError = (error: unknown): ErrorCallout => {
  if (isHttpFetchError(error)) {
    if (error.response?.status === 409) {
      return {
        type: 'conflict',
        message: i18n.translate('xpack.agenticInvestigations.proposalCard.conflictError', {
          defaultMessage:
            'This proposal has already been decided. Refresh the page to see its status.',
        }),
      };
    }
    if (error.response?.status === 410) {
      return {
        type: 'expired',
        message: i18n.translate('xpack.agenticInvestigations.proposalCard.expiredError', {
          defaultMessage:
            'The decision deadline has passed and this proposal can no longer be decided.',
        }),
      };
    }
  }
  return {
    type: 'error',
    message:
      error instanceof Error
        ? error.message
        : i18n.translate('xpack.agenticInvestigations.proposalCard.genericError', {
            defaultMessage: 'The decision could not be recorded. Please try again.',
          }),
  };
};

export interface ProposalApprovalCardProps {
  /** Proposal id from `attachment.origin ?? attachment.id`. */
  proposalId: string;
  /**
   * Superseded rows already followed to reach `proposalId`. Set only by the
   * redirect below; a caller rendering the card directly leaves it unset.
   */
  chainHops?: number;
}

/**
 * Ceiling on the superseded-row redirect. A revision chain is as long as the
 * analyst keeps revising, so this is not a product limit — it is the stop that
 * keeps a corrupt chain pointing in a circle from rendering forever.
 */
const MAX_SUPERSEDE_HOPS = 50;

/**
 * Inline card rendered inside the Agent Builder conversation stream when a
 * proposal attachment is encountered.
 *
 * Renders inside the framework's `EuiSplitPanel.Inner paddingSize="none"`, so
 * the card adds its own horizontal padding.
 */
export const ProposalApprovalCard = memo<ProposalApprovalCardProps>(
  ({ proposalId, chainHops = 0 }) => {
    const { euiTheme } = useEuiTheme();
    const [mode, setMode] = useState<CardMode>('view');
    const [dismissReason, setDismissReason] = useState<DismissReason>('wrong');
    const [rationale, setRationale] = useState('');

    const proposalQuery = useProposal(proposalId);
    const approveMutation = useApproveProposal();
    const dismissMutation = useDismissProposal();

    const isLoading = approveMutation.isLoading || dismissMutation.isLoading;
    const mutationError = approveMutation.error ?? dismissMutation.error;
    const errorCallout = mutationError ? mapError(mutationError) : null;

    const resetMutations = useCallback(() => {
      approveMutation.reset();
      dismissMutation.reset();
    }, [approveMutation, dismissMutation]);

    const handleApprove = useCallback(async () => {
      resetMutations();
      try {
        await approveMutation.mutateAsync({
          id: proposalId,
          body: { actionInput: proposalQuery.data?.actionInput },
        });
        setMode('view');
      } catch {
        // shown via errorCallout
      }
    }, [approveMutation, proposalQuery.data?.actionInput, proposalId, resetMutations]);

    const handleDismissClick = useCallback(() => {
      resetMutations();
      setMode('dismissing');
    }, [resetMutations]);

    const handleDismissConfirm = useCallback(async () => {
      resetMutations();
      try {
        await dismissMutation.mutateAsync({
          id: proposalId,
          body: { dismissReason, rationale: rationale.trim() || undefined },
        });
        setMode('view');
      } catch {
        // shown via errorCallout
      }
    }, [dismissMutation, dismissReason, proposalId, rationale, resetMutations]);

    const handleDismissCancel = useCallback(() => {
      setMode('view');
      setRationale('');
      resetMutations();
    }, [resetMutations]);

    const liveProposal = proposalQuery.data;

    // A conversation attachment keeps the id it was created with, and a
    // revision marks that row superseded: it carries no actions, so rendering
    // it leaves the analyst with a dead card for a proposal that is no longer
    // the one awaiting their decision. Follow the pointer to the live head
    // instead — that is the revision the fresh decision belongs to.
    const successorId = liveProposal?.supersededBy;
    if (successorId && successorId !== proposalId) {
      if (chainHops >= MAX_SUPERSEDE_HOPS) {
        return (
          <KbnWarningCallout
            size="s"
            title={i18n.translate('xpack.agenticInvestigations.proposalCard.chainTooLong', {
              defaultMessage:
                'This proposal has been revised many times. Open the conversation again to see its latest revision.',
            })}
          />
        );
      }
      return <ProposalApprovalCard proposalId={successorId} chainHops={chainHops + 1} />;
    }

    if (proposalQuery.isLoading) {
      return <EuiLoadingSpinner size="m" />;
    }

    if (proposalQuery.isError || !liveProposal) {
      return (
        <KbnDangerCallout
          size="s"
          title={i18n.translate('xpack.agenticInvestigations.proposalCard.loadError', {
            defaultMessage: 'Unable to load this proposal. Try refreshing the page.',
          })}
        />
      );
    }

    const actionName =
      liveProposal.action?.name ?? liveProposal.actionWorkflowId ?? PROPOSAL_WITHOUT_ACTION_LABEL;

    const isPending = isAwaitingDecision(liveProposal);
    // `expired` is the computed flag for a deadline that has passed; `status:
    // 'expired'` is the durable settlement, which the workflow can write before
    // the deadline when no decision was reached. Without both, a proposal
    // settled early shows neither actions nor an explanation.
    const isExpired = liveProposal.expired || liveProposal.status === 'expired';
    // The decision, not the status: a proposal stays `pending` while its
    // approval is still travelling through the gate workflow, and an expired one
    // is settled without anyone having decided anything.
    const decision = liveProposal.decision;

    // The row's own impact first: a revision can override it, and it is the
    // value the queue sorts by, so preferring the action's declared impact
    // would let an approved revision display the impact it replaced. The
    // action's value is only the default for a proposal that never set one.
    // (`category` keeps the opposite precedence — a revision cannot change it.)
    const impact = liveProposal.impact ?? liveProposal.action?.impact;
    const tone =
      impact === 'high' || impact === 'critical' ? ('danger' as const) : ('primary' as const);

    let primaryAction: ApprovalAction | undefined;
    let secondaryActions: ApprovalAction[] | undefined;

    if (isPending) {
      if (mode === 'view') {
        primaryAction = {
          label: i18n.translate('xpack.agenticInvestigations.proposalCard.approve', {
            defaultMessage: 'Approve',
          }),
          color: 'success',
          onClick: handleApprove,
          isDisabled: isExpired || isLoading,
          isLoading,
          'data-test-subj': `agenticInvestigationsProposalApprove-${proposalId}`,
        };
        secondaryActions = [
          {
            label: i18n.translate('xpack.agenticInvestigations.proposalCard.dismiss', {
              defaultMessage: 'Dismiss',
            }),
            color: 'danger',
            onClick: handleDismissClick,
            isDisabled: isExpired || isLoading,
            'data-test-subj': `agenticInvestigationsProposalDismiss-${proposalId}`,
          },
        ];
      } else {
        // mode === 'dismissing'
        primaryAction = {
          label: i18n.translate('xpack.agenticInvestigations.proposalCard.confirmDismiss', {
            defaultMessage: 'Confirm dismiss',
          }),
          color: 'danger',
          onClick: handleDismissConfirm,
          isDisabled: isLoading || !rationale.trim(),
          isLoading,
          'data-test-subj': `agenticInvestigationsProposalDismissConfirm-${proposalId}`,
        };
        secondaryActions = [
          {
            label: i18n.translate('xpack.agenticInvestigations.proposalCard.cancel', {
              defaultMessage: 'Cancel',
            }),
            color: 'text',
            onClick: handleDismissCancel,
            isDisabled: isLoading,
            'data-test-subj': `agenticInvestigationsProposalDismissCancel-${proposalId}`,
          },
        ];
      }
    }

    return (
      <div
        css={css({ padding: `${euiTheme.size.m}` })}
        data-test-subj={`agenticInvestigationsProposalCard-${proposalId}`}
      >
        <ApprovalContent
          showHeader={false}
          title={actionName}
          tone={tone}
          iconType="lock"
          description={liveProposal.comment}
          blastRadius={{ variant: 'list', items: toBlastRadiusItems(liveProposal) }}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        >
          {/* Outcome callouts for decided/expired states */}
          {isExpired && !decision && (
            <>
              <EuiSpacer size="m" />
              <div css={css({ padding: `0 ${euiTheme.size.m}` })}>
                <KbnWarningCallout
                  announceOnMount
                  size="s"
                  title={i18n.translate('xpack.agenticInvestigations.proposalCard.expiredCallout', {
                    defaultMessage:
                      'The decision deadline has passed. This proposal can no longer be actioned.',
                  })}
                />
              </div>
            </>
          )}
          {decision && (
            <>
              <EuiSpacer size="m" />
              <div css={css({ padding: `0 ${euiTheme.size.m}` })}>
                <KbnInfoCallout
                  announceOnMount
                  size="s"
                  title={i18n.translate('xpack.agenticInvestigations.proposalCard.decidedCallout', {
                    defaultMessage:
                      'This proposal has already been decided ({decision}). No further action is needed.',
                    values: { decision: DECISION_LABELS[decision] },
                  })}
                />
              </div>
            </>
          )}

          {/* Inline dismiss form */}
          {mode === 'dismissing' && (
            <>
              <EuiSpacer size="m" />
              <ProposalDismissForm
                dismissReason={dismissReason}
                rationale={rationale}
                onDismissReasonChange={setDismissReason}
                onRationaleChange={setRationale}
                data-test-subj={`agenticInvestigationsProposalDismissForm-${proposalId}`}
              />
            </>
          )}

          {/* Decision mutation error feedback */}
          {errorCallout?.type === 'conflict' && (
            <>
              <EuiSpacer size="s" />
              <div css={css({ padding: `0 ${euiTheme.size.m}` })}>
                <KbnWarningCallout announceOnMount size="s" title={errorCallout.message} />
              </div>
            </>
          )}
          {(errorCallout?.type === 'expired' || errorCallout?.type === 'error') && (
            <>
              <EuiSpacer size="s" />
              <div css={css({ padding: `0 ${euiTheme.size.m}` })}>
                <KbnDangerCallout announceOnMount size="s" title={errorCallout.message} />
              </div>
            </>
          )}
        </ApprovalContent>
      </div>
    );
  }
);

ProposalApprovalCard.displayName = 'ProposalApprovalCard';
