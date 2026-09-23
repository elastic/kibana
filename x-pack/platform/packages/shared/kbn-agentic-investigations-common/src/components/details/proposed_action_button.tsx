/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { ApprovalModal, getProposalTitle, type ApprovalProposal } from '@kbn/proposals-ui';
import { DETAILS_FLYOUT_LABELS } from './translations';

export interface ProposedActionButtonProps {
  /** Same shape the card's recommended-action menu item reads its proposal from. */
  proposal: ApprovalProposal;
  /** Commits the approval, e.g. the mutation the queue page hands `InvestigationActionModals`. */
  onConfirm: () => void;
  /** Omitted by hosts that cannot record a dismissal, which also hides the modal's Dismiss button. */
  onDismiss?: () => void;
  'data-test-subj'?: string;
}

/**
 * A row in the flyout's "Proposed actions" list.
 *
 * Clicking it opens the same {@link ApprovalModal} the conversation card's recommended-action
 * menu item opens (see `onClickRecommendedAction` in `BaseActions`), so a proposal reads and
 * decides identically whether it was reached from the queue or from inside its own flyout.
 */
export const ProposedActionButton = memo<ProposedActionButtonProps>(
  ({ proposal, onConfirm, onDismiss, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const category = proposal.action?.category ?? proposal.category;
    const reversible = proposal.action?.reversible;
    const caption = [
      category,
      reversible === undefined
        ? undefined
        : reversible
        ? DETAILS_FLYOUT_LABELS.proposedAction.reversible
        : DETAILS_FLYOUT_LABELS.proposedAction.irreversible,
    ]
      .filter((part): part is string => Boolean(part))
      .join(' • ');

    return (
      <>
        <EuiPanel
          hasBorder
          paddingSize="m"
          role="button"
          tabIndex={0}
          aria-label={DETAILS_FLYOUT_LABELS.proposedAction.ariaLabel}
          data-test-subj={dataTestSubj}
          css={css({
            cursor: 'pointer',
            '&:hover': { backgroundColor: euiTheme.colors.backgroundBaseSubdued },
            borderRadius: euiTheme.border.radius.medium,
          })}
          onClick={openModal}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openModal();
            }
          }}
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
                  <EuiBadge color="primary" iconType="clock">
                    {DETAILS_FLYOUT_LABELS.proposedAction.needsReviewBadge}
                  </EuiBadge>
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

        {isModalOpen && (
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
