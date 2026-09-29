/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiModal, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import type { DismissReason } from '@kbn/proposals-common';
import type { ApprovalAction } from './approval_content';
import { ApprovalContent } from './approval_content';
import { DeclineReasonForm } from './decline_reason_form';
import {
  getProposalCaption,
  getProposalDecision,
  getProposalTitle,
  getProposalTone,
  isProposalExpired,
} from './proposal_helpers';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import type { ApprovalProposal } from './types';

export interface DeclineParams {
  dismissReason: DismissReason;
  rationale?: string;
}

type ApprovalModalMode = 'view' | 'declining';

export interface ApprovalModalProps {
  alwaysAllow?: {
    id: string;
    label: React.ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  proposal: ApprovalProposal;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  /**
   * Records a decline with its structured reason and optional free-text detail. Awaited by this
   * modal — same contract as `onConfirm` — so its own Decline button shows a loading state and a
   * rejection surfaces in `ApprovalContent`'s error banner rather than being swallowed. Omitted by
   * hosts that cannot record a decline, which also hides the Decline trigger rather than leaving
   * it inert.
   */
  onDismiss?: (params: DeclineParams) => Promise<void>;
  /**
   * Whether this proposal's approve/decline is currently in flight. Sourced from the host's own
   * mutation cache (e.g. `useIsMutating`) so it agrees with whatever else shows the same proposal
   * (the flyout row this modal opened from, say) and survives this modal being closed and
   * reopened mid-submission.
   */
  isSubmitting?: 'applying' | 'declining';
  /** Who's approving, for the "Applying"/"Declining" caption before the server confirms a decider. */
  currentActorName?: string;
  'data-test-subj'?: string;
}

/**
 * Asks for a decision on one proposal.
 *
 * Takes the proposal rather than something adapted from it: the title, tone and expiry all come
 * off the proposal, so this modal and the Agent Builder card derive them the same way instead of
 * from whatever each host happened to keep.
 *
 * Declining shows its reason form in this same modal — swapping `ApprovalContent`'s body and
 * footer via its own `mode`, rather than closing this modal and opening a second one. The header
 * (title, badge, caption) stays exactly where it is, so the analyst never loses the proposal
 * they were deciding on.
 */
export const ApprovalModal = memo<ApprovalModalProps>(
  ({
    alwaysAllow,
    proposal,
    onConfirm,
    onClose,
    onDismiss,
    isSubmitting,
    currentActorName,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const titleId = useGeneratedHtmlId({ prefix: 'approvalModalHeader' });

    const [mode, setMode] = useState<ApprovalModalMode>('view');
    const [dismissReason, setDismissReason] = useState<DismissReason>('no_reason');
    const [rationale, setRationale] = useState('');

    const title = getProposalTitle(proposal);
    const isExpired = isProposalExpired(proposal);

    const startDeclining = useCallback(() => setMode('declining'), []);

    const resetDeclineForm = useCallback(() => {
      setMode('view');
      setDismissReason('no_reason');
      setRationale('');
    }, []);

    const confirmDecline = useCallback(async () => {
      if (!onDismiss) {
        return;
      }
      await onDismiss({ dismissReason, rationale: rationale.trim() || undefined });
      resetDeclineForm();
    }, [onDismiss, dismissReason, rationale, resetDeclineForm]);

    // `no_reason` — the default — already counts as an explicit selection; only `other` needs
    // the free-text field, since it is the sole detail that reason carries.
    const isDeclineDisabled = dismissReason === 'other' && rationale.trim() === '';

    const primaryAction: ApprovalAction =
      mode === 'view'
        ? {
            label: APPROVAL_MODAL_TRANSLATIONS.approve,
            onClick: onConfirm,
            isDisabled: isExpired,
            'data-test-subj': dataTestSubj ? `${dataTestSubj}-confirm` : undefined,
          }
        : {
            label: APPROVAL_MODAL_TRANSLATIONS.dismiss,
            color: 'danger',
            iconType: 'cross',
            onClick: confirmDecline,
            isDisabled: isDeclineDisabled,
            'data-test-subj': dataTestSubj ? `${dataTestSubj}-confirm-decline` : undefined,
          };

    const secondaryActions: ApprovalAction[] | undefined =
      mode === 'view'
        ? onDismiss
          ? [
              {
                label: APPROVAL_MODAL_TRANSLATIONS.dismiss,
                iconType: 'cross',
                color: 'text',
                onClick: startDeclining,
                isDisabled: isExpired,
                'data-test-subj': dataTestSubj ? `${dataTestSubj}-dismiss` : undefined,
              },
            ]
          : undefined
        : [
            {
              label: APPROVAL_MODAL_TRANSLATIONS.cancelDecline,
              color: 'text',
              onClick: resetDeclineForm,
              'data-test-subj': dataTestSubj ? `${dataTestSubj}-cancel-decline` : undefined,
            },
          ];

    return (
      <EuiModal
        aria-labelledby={titleId}
        onClose={onClose}
        css={css({ maxWidth: 640, width: '100%', borderRadius: euiTheme.size.xs })}
        data-test-subj={dataTestSubj}
      >
        <ApprovalContent
          title={title}
          tone={getProposalTone(proposal)}
          comment={mode === 'view' ? proposal.comment : undefined}
          titleId={titleId}
          caption={getProposalCaption(proposal, { includeRiskDetails: true })}
          decision={getProposalDecision(proposal)}
          isSubmitting={isSubmitting}
          currentActorName={currentActorName}
          alwaysAllow={mode === 'view' ? alwaysAllow : undefined}
          data-test-subj={dataTestSubj}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        >
          {/* Hidden once the decline is actually submitting: the banner above already reads
              "Declining", and the footer with Cancel/Decline is gone too — showing the form
              alongside a banner that says the decision is already in flight would be confusing. */}
          {mode === 'declining' && isSubmitting !== 'declining' && (
            <DeclineReasonForm
              dismissReason={dismissReason}
              rationale={rationale}
              onDismissReasonChange={setDismissReason}
              onRationaleChange={setRationale}
              data-test-subj={dataTestSubj ? `${dataTestSubj}-decline-form` : undefined}
            />
          )}
        </ApprovalContent>
      </EuiModal>
    );
  }
);

ApprovalModal.displayName = 'ApprovalModal';
