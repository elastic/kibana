/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: the integration onboarding wizard embedded in a large flyout, opened from the
// browse tile. Reference host for the embeddable contract (GroupWizardHostProps): local step
// state, no URL changes, the host owns the header, close and exit.

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { PackageIcon } from '../../../../../../components';
import { useGroupPackage } from '../../../../../../hooks/use_group_package';
import type { IntegrationCardItem } from '../home/card_utils';

import { GroupOnboardingWizard } from './group_wizard';

/**
 * PROTOTYPE: group tiles open the wizard in a flyout instead of navigating, regardless of
 * `enableIntegrationTileClickToAdd`. Flip to false to go back to the full-page route.
 */
export const GROUP_TILE_OPENS_FLYOUT = true;

export const GroupWizardFlyout: React.FC<{ groupName: string; onClose: () => void }> = ({
  groupName,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const { group, options, isLoading } = useGroupPackage(groupName);
  const available = options.filter((o) => o.child);

  return (
    <EuiFlyout
      size="l"
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="groupWizardFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {group && (
            <EuiFlexItem grow={false}>
              <PackageIcon
                packageName={group.name}
                version={group.version}
                icons={group.icons}
                size="l"
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={titleId}>{group?.title ?? 'Add integration'}</h2>
            </EuiTitle>
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
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading ? (
          <EuiSkeletonText lines={6} />
        ) : group && available.length ? (
          <GroupOnboardingWizard
            group={group}
            options={available}
            stepState="local"
            layout="embedded"
            exitLabel="Done"
            // PROTOTYPE: the flyout host just closes; a real host decides where to go next
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
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

/** Browse pages: make group tiles open the wizard flyout, and render the flyout when open. */
export const useGroupWizardFlyout = () => {
  const [groupName, setGroupName] = useState<string>();
  const withGroupFlyout = useCallback(
    <T extends IntegrationCardItem>(cards: T[]): T[] =>
      GROUP_TILE_OPENS_FLYOUT
        ? cards.map((card) =>
            card.isIntegrationGroupCard
              ? { ...card, onCardClick: () => setGroupName(card.name) }
              : card
          )
        : cards,
    []
  );
  const flyout = groupName ? (
    <GroupWizardFlyout groupName={groupName} onClose={() => setGroupName(undefined)} />
  ) : null;
  return { withGroupFlyout, flyout, openGroupWizard: setGroupName };
};
