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
import {
  ApprovalContent,
  getProposalTone,
  isProposalExpired,
  toActionImpactItems,
} from '@kbn/proposals-ui';
import type { ApprovalAction } from '@kbn/proposals-ui';
import { isAwaitingDecision } from '@kbn/proposals-common';
import type { DismissReason, ProposalDecision } from '@kbn/proposals-common';
import { PROPOSAL_WITHOUT_ACTION_LABEL } from '../translations';
import { useApproveProposal, useDismissProposal, useProposal } from '../hooks/use_proposals_api';
import { ProposalDismissForm } from './proposal_dismiss_form';

type CardMode = 'view' | 'dismissing';

/** What the analyst concluded, which is separate from how far it then got. */
const DECISION_LABELS: Record<ProposalDecision, string> = {
  approved: i18n.translate('xpack.proposals.proposalCard.decision.approved', {
    defaultMessage: 'approved',
  }),
  dismissed: i18n.translate('xpack.proposals.proposalCard.decision.dismissed', {
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
        message: i18n.translate('xpack.proposals.proposalCard.conflictError', {
          defaultMessage:
            'This proposal has already been decided. Refresh the page to see its status.',
        }),
      };
    }
    if (error.response?.status === 410) {
      return {
        type: 'expired',
        message: i18n.translate('xpack.proposals.proposalCard.expiredError', {
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
        : i18n.translate('xpack.proposals.proposalCard.genericError', {
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
            title={i18n.translate('xpack.proposals.proposalCard.chainTooLong', {
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
          title={i18n.translate('xpack.proposals.proposalCard.loadError', {
            defaultMessage: 'Unable to load this proposal. Try refreshing the page.',
          })}
        />
      );
    }

    const actionName =
      liveProposal.action?.name ?? liveProposal.actionWorkflowId ?? PROPOSAL_WITHOUT_ACTION_LABEL;

    const isPending = isAwaitingDecision(liveProposal);
    const isExpired = isProposalExpired(liveProposal);
    // The decision, not the status: a proposal stays `pending` while its
    // approval is still travelling through the gate workflow, and an expired one
    // is settled without anyone having decided anything.
    const decision = liveProposal.decision;

    let primaryAction: ApprovalAction | undefined;
    let secondaryActions: ApprovalAction[] | undefined;

    if (isPending) {
      if (mode === 'view') {
        primaryAction = {
          label: i18n.translate('xpack.proposals.proposalCard.approve', {
            defaultMessage: 'Approve',
          }),
          color: 'success',
          onClick: handleApprove,
          isDisabled: isExpired || isLoading,
          isLoading,
          'data-test-subj': `proposalApprove-${proposalId}`,
        };
        secondaryActions = [
          {
            label: i18n.translate('xpack.proposals.proposalCard.dismiss', {
              defaultMessage: 'Dismiss',
            }),
            color: 'danger',
            onClick: handleDismissClick,
            isDisabled: isExpired || isLoading,
            'data-test-subj': `proposalDismiss-${proposalId}`,
          },
        ];
      } else {
        // mode === 'dismissing'
        primaryAction = {
          label: i18n.translate('xpack.proposals.proposalCard.confirmDismiss', {
            defaultMessage: 'Confirm dismiss',
          }),
          color: 'danger',
          onClick: handleDismissConfirm,
          isDisabled: isLoading || !rationale.trim(),
          isLoading,
          'data-test-subj': `proposalDismissConfirm-${proposalId}`,
        };
        secondaryActions = [
          {
            label: i18n.translate('xpack.proposals.proposalCard.cancel', {
              defaultMessage: 'Cancel',
            }),
            color: 'text',
            onClick: handleDismissCancel,
            isDisabled: isLoading,
            'data-test-subj': `proposalDismissCancel-${proposalId}`,
          },
        ];
      }
    }

    return (
      <div
        css={css({ padding: `${euiTheme.size.m}` })}
        data-test-subj={`proposalCard-${proposalId}`}
      >
        <ApprovalContent
          showHeader={false}
          title={actionName}
          tone={getProposalTone(liveProposal)}
          iconType="lock"
          comment={liveProposal.comment}
          actionImpact={{ variant: 'list', items: toActionImpactItems(liveProposal) }}
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
                  title={i18n.translate('xpack.proposals.proposalCard.expiredCallout', {
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
                  title={i18n.translate('xpack.proposals.proposalCard.decidedCallout', {
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
                data-test-subj={`proposalDismissForm-${proposalId}`}
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
