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
  /**
   * Awaited by `ApprovalContent` itself, which shows the "Applying" transient state for as long
   * as this takes and the "Applied" one once it resolves — pass the mutation's own promise
   * (`mutateAsync`) rather than a fire-and-forget `mutate` call.
   */
  onConfirm: () => Promise<void>;
  onClose: () => void;
  /**
   * Renders Dismiss beside Approve. Omitted by hosts that cannot record a dismissal, which is
   * why there is no Cancel here — `EuiModal`'s own close control already covers walking away.
   */
  onDismiss?: () => void;
  /** Who's approving, for the optimistic "Applying" state before the server confirms a decider. */
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
          caption={getProposalCaption(proposal)}
          decision={getProposalDecision(proposal)}
          currentActorName={currentActorName}
          alwaysAllow={alwaysAllow}
          data-test-subj={dataTestSubj}
          primaryAction={{
            label: APPROVAL_MODAL_TRANSLATIONS.approve,
            onClick: onConfirm,
            outcomeStatus: 'applied',
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
