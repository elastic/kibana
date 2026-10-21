/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiModal, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { ApprovalContent } from './approval_content';
import type { DeclineParams, AlwaysAllowOption, ApprovalProposal } from './types';

export interface ApprovalModalProps {
  /** Disables the Approve/Decline actions without hiding them, so a reopened decided-or-expired-looking proposal still reads the same. */
  readOnly?: boolean;
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
 * Takes the proposal rather than something adapted from it, and forwards it straight to
 * `ApprovalContent`: title, tone, caption, decision and expiry are all derived there, the same
 * way for this modal and for the Agent Builder chat card, instead of each host deriving them
 * itself.
 *
 * Declining is `ApprovalContent`'s own built-in flow — this modal just forwards `onDismiss` and
 * lets it swap its body and footer in place, rather than closing this modal and opening a second
 * one. The header (title, badge, caption) stays exactly where it is, so the analyst never loses
 * the proposal they were deciding on.
 */
export const ApprovalModal = memo<ApprovalModalProps>(
  ({
    readOnly = false,
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

    return (
      <EuiModal
        aria-labelledby={titleId}
        onClose={onClose}
        css={css({ maxWidth: 640, width: '100%', borderRadius: euiTheme.size.xs })}
        data-test-subj={dataTestSubj}
      >
        <ApprovalContent
          proposal={proposal}
          titleId={titleId}
          isSubmitting={isSubmitting}
          currentActorName={currentActorName}
          alwaysAllow={alwaysAllow}
          readOnly={readOnly}
          data-test-subj={dataTestSubj}
          onApprove={onConfirm}
          onDismiss={onDismiss}
        />
      </EuiModal>
    );
  }
);

ApprovalModal.displayName = 'ApprovalModal';
