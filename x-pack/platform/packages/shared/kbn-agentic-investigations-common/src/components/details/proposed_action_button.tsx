/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { ApprovalModal, getProposalTitle, type ApprovalProposal } from '@kbn/proposals-ui';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { getEmptyValue } from '../helpers';
import {
  ProposedActionStatusBadge,
  type ProposedActionStatusBadgeProps,
} from './needs_review_badge';

export interface ProposedActionButtonProps {
  /** Same shape the card's recommended-action menu item reads its proposal from. */
  proposal: ApprovalProposal;
  /** Commits the approval, e.g. the mutation the queue page hands `InvestigationActionModals`. */
  onConfirm: () => void;
  /** Omitted by hosts that cannot record a dismissal, which also hides the modal's Dismiss button. */
  onDismiss?: () => void;
  'data-test-subj'?: string;
}

type BadgeConfig = Required<ProposedActionStatusBadgeProps>;

const badgeConfigFor = (proposal: ApprovalProposal): BadgeConfig => {
  if (proposal.decision === 'approved') {
    return {
      color: 'success',
      iconType: 'check',
      label: DETAILS_FLYOUT_LABELS.proposedAction.appliedBadge,
    };
  }
  if (proposal.decision === 'dismissed') {
    return {
      color: 'default',
      iconType: 'cross',
      label: DETAILS_FLYOUT_LABELS.proposedAction.dismissedBadge,
    };
  }
  return {
    color: 'primary',
    iconType: 'clock',
    label: DETAILS_FLYOUT_LABELS.proposedAction.needsReviewBadge,
  };
};

/**
 * A row in the flyout's "Proposed actions" list.
 *
 * A pending proposal is clickable: it opens the same {@link ApprovalModal} the conversation
 * card's recommended-action menu item opens (see `onClickRecommendedAction` in `BaseActions`), so
 * a proposal reads and decides identically whether it was reached from the queue or from inside
 * its own flyout. A decided one is a closed record instead — the badge reports the outcome and
 * who/when decided it, and there is nothing left to click through to.
 */
export const ProposedActionButton = memo<ProposedActionButtonProps>(
  ({ proposal, onConfirm, onDismiss, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const isDecided = proposal.decision !== undefined;

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const handleConfirm = useCallback(() => {
      onConfirm();
      closeModal();
    }, [onConfirm, closeModal]);

    const handleDismiss = useCallback(() => {
      onDismiss?.();
      closeModal();
    }, [onDismiss, closeModal]);

    const badge = badgeConfigFor(proposal);

    const decidedByName = proposal.decidedBy?.fullName ?? proposal.decidedBy?.username ?? undefined;
    const category = proposal.action?.category ?? proposal.category;
    const reversible = proposal.action?.reversible;
    const reversibleLabel =
      reversible !== undefined
        ? DETAILS_FLYOUT_LABELS.proposedAction[reversible ? 'reversible' : 'irreversible']
        : getEmptyValue();
    const pendingCaption = [category, reversibleLabel].filter((e) => e?.trim().length).join(' • ');

    const caption =
      isDecided && decidedByName && proposal.decidedAt ? (
        <FormattedMessage
          id="xpack.alertzero.detailsFlyout.proposedAction.decidedByCaption"
          defaultMessage="{approvalType} by {name} at {time}"
          values={{
            approvalType: badge.label,
            name: decidedByName,
            time: <FormattedTime value={proposal.decidedAt} />,
          }}
        />
      ) : Boolean(pendingCaption) ? (
        pendingCaption
      ) : (
        getEmptyValue()
      );

    return (
      <>
        <EuiPanel
          hasBorder
          paddingSize="m"
          role={isDecided ? undefined : 'button'}
          tabIndex={isDecided ? undefined : 0}
          aria-label={isDecided ? undefined : DETAILS_FLYOUT_LABELS.proposedAction.ariaLabel}
          data-test-subj={dataTestSubj}
          css={css({
            borderRadius: euiTheme.border.radius.medium,
            cursor: isDecided ? 'default' : 'pointer',
            ...(isDecided
              ? {}
              : { '&:hover': { backgroundColor: euiTheme.colors.backgroundBaseSubdued } }),
          })}
          onClick={isDecided ? undefined : openModal}
          onKeyDown={
            isDecided
              ? undefined
              : (event: React.KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openModal();
                  }
                }
          }
        >
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{getProposalTitle(proposal)}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ProposedActionStatusBadge
                    color={badge.color}
                    iconType={badge.iconType}
                    label={badge.label}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {caption && (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {caption}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>

        {!isDecided && isModalOpen && (
          <ApprovalModal
            proposal={proposal}
            onConfirm={handleConfirm}
            onClose={closeModal}
            onDismiss={onDismiss ? handleDismiss : undefined}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-modal` : undefined}
          />
        )}
      </>
    );
  }
);

ProposedActionButton.displayName = 'ProposedActionButton';
