/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: the integration onboarding wizard embedded in a large modal, opened from the
// browse tile. Reference host for the embeddable contract (GroupWizardHostProps): local step
// state, no URL changes, the host owns the header, close and exit.

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonText,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { useGroupPackage } from '../../../../../../hooks/use_group_package';
import type { IntegrationCardItem } from '../home/card_utils';

import { GroupOnboardingWizard } from './group_wizard';
import { GroupIcon } from './group_icon';

/**
 * PROTOTYPE: group tiles open the wizard in a modal instead of navigating, regardless of
 * `enableIntegrationTileClickToAdd`. Flip to false to go back to the full-page route.
 */
export const GROUP_TILE_OPENS_MODAL = true;

export const GroupWizardModal: React.FC<{ groupName: string; onClose: () => void }> = ({
  groupName,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const { group, options, isLoading } = useGroupPackage(groupName);

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={false}
      // PROTOTYPE: fixed size so the modal doesn't resize between steps
      css={css({ width: 'min(1280px, 92vw)', height: 'min(900px, 90vh)' })}
      data-test-subj="groupWizardModal"
    >
      <EuiModalHeader>
        <div>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {group && (
              <EuiFlexItem grow={false}>
                <GroupIcon group={group} options={options} size="l" />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiModalHeaderTitle id={titleId}>
                {group?.title ?? 'Add integration'}
              </EuiModalHeaderTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">Integration</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          {group?.description && (
            <EuiText size="s" color="subdued">
              {group.description}
            </EuiText>
          )}
        </div>
      </EuiModalHeader>
      <EuiModalBody>
        {isLoading ? (
          <EuiSkeletonText lines={6} />
        ) : group && options.length ? (
          <GroupOnboardingWizard
            group={group}
            options={options}
            stepState="local"
            layout="embedded"
            exitLabel="Done"
            // PROTOTYPE: the modal host just closes; a real host decides where to go next
            onExit={onClose}
          />
        ) : (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            title={`"${group?.title ?? groupName}" can't be added right now`}
          />
        )}
      </EuiModalBody>
    </EuiModal>
  );
};

/** Browse pages: make group tiles open the wizard modal, and render the modal when open. */
export const useGroupWizardModal = () => {
  const [groupName, setGroupName] = useState<string>();
  const withGroupWizard = useCallback(
    <T extends IntegrationCardItem>(cards: T[]): T[] =>
      GROUP_TILE_OPENS_MODAL
        ? cards.map((card) =>
            card.isIntegrationGroupCard
              ? { ...card, onCardClick: () => setGroupName(card.name) }
              : card
          )
        : cards,
    []
  );
  const groupWizardModal = groupName ? (
    <GroupWizardModal groupName={groupName} onClose={() => setGroupName(undefined)} />
  ) : null;
  return { withGroupWizard, groupWizardModal, openGroupWizard: setGroupName };
};
