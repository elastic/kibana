/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiModal, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import type { ApprovalAction, DeclineParams, AlwaysAllowOption } from './types';
import { ApprovalContent } from './approval_content';
import {
  getProposalCaption,
  getProposalDecision,
  getProposalTone,
  isProposalExpired,
} from './proposal_helpers';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import type { ApprovalProposal } from './types';

export interface ApprovalModalProps {
  alwaysAllow?: AlwaysAllowOption;
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
 * Declining is `ApprovalContent`'s own built-in flow — this modal just forwards `onDismiss` and
 * lets it swap its body and footer in place, rather than closing this modal and opening a second
 * one. The header (title, badge, caption) stays exactly where it is, so the analyst never loses
 * the proposal they were deciding on.
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
    const titleId = useGeneratedHtmlId({ prefix: 'ApprovalModal' });

    const { title } = proposal;
    const isExpired = isProposalExpired(proposal);

    const primaryAction: ApprovalAction = {
      label: APPROVAL_MODAL_TRANSLATIONS.approve,
      onClick: onConfirm,
      isDisabled: isExpired,
      'data-test-subj': dataTestSubj ? `${dataTestSubj}-confirm` : undefined,
    };

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
          comment={proposal.comment}
          caption={getProposalCaption(proposal, { includeRiskDetails: true })}
          decision={getProposalDecision(proposal)}
          isSubmitting={isSubmitting}
          currentActorName={currentActorName}
          alwaysAllow={alwaysAllow}
          data-test-subj={dataTestSubj}
          primaryAction={primaryAction}
          onDismiss={onDismiss}
          previousExecutionError={proposal.previousExecutionError}
          isExpired={isExpired}
        />
      </EuiModal>
    );
  }
);

ApprovalModal.displayName = 'ApprovalModal';
