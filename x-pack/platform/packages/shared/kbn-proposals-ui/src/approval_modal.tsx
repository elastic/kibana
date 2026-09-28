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
import {
  getProposalCaption,
  getProposalDecision,
  getProposalTitle,
  getProposalTone,
  isProposalExpired,
} from './proposal_helpers';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import type { ApprovalProposal } from './types';

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
   * Renders Dismiss beside Approve. Omitted by hosts that cannot record a dismissal, which is
   * why there is no Cancel here — `EuiModal`'s own close control already covers walking away.
   */
  onDismiss?: () => void;
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

    const title = getProposalTitle(proposal);
    const isExpired = isProposalExpired(proposal);

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
          iconType="lock"
          comment={proposal.comment}
          titleId={titleId}
          caption={getProposalCaption(proposal, { includeRiskDetails: true })}
          decision={getProposalDecision(proposal)}
          isSubmitting={isSubmitting}
          currentActorName={currentActorName}
          alwaysAllow={alwaysAllow}
          data-test-subj={dataTestSubj}
          primaryAction={{
            label: APPROVAL_MODAL_TRANSLATIONS.approve,
            onClick: onConfirm,
            isDisabled: isExpired,
            'data-test-subj': dataTestSubj ? `${dataTestSubj}-confirm` : undefined,
          }}
          secondaryActions={
            onDismiss
              ? [
                  {
                    label: APPROVAL_MODAL_TRANSLATIONS.dismiss,
                    iconType: 'cross',
                    color: 'text',
                    onClick: onDismiss,
                    isDisabled: isExpired,
                    'data-test-subj': dataTestSubj ? `${dataTestSubj}-dismiss` : undefined,
                  },
                ]
              : undefined
          }
        />
      </EuiModal>
    );
  }
);

ApprovalModal.displayName = 'ApprovalModal';
