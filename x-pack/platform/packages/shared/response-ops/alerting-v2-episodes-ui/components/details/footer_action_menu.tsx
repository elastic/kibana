/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { partition } from 'lodash';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction } from '../../actions/types';
import * as i18n from './translations';

/**
 * Episode workflow actions, grouped together right below "View details". Every other
 * action (edit tags, open in Discover) is grouped after them.
 */
const WORKFLOW_ACTION_IDS: ReadonlySet<string> = new Set([
  'ALERTING_V2_ACK_EPISODE',
  'ALERTING_V2_UNACK_EPISODE',
  'ALERTING_V2_SNOOZE_EPISODE',
  'ALERTING_V2_UNSNOOZE_EPISODE',
  'ALERTING_V2_RESOLVE_EPISODE',
  'ALERTING_V2_UNRESOLVE_EPISODE',
  'ALERTING_V2_EDIT_EPISODE_ASSIGNEE',
]);

export interface EpisodeFooterActionMenuProps {
  /** Already filtered to compatible actions. The menu does not re-filter. */
  actions: EpisodeAction[];
  episodes: AlertEpisode[];
  /** Full episode details page href, rendered as the first menu item. */
  viewDetailsHref: string;
  onSuccess?: () => void;
}

/** Primary flyout footer control listing every action available for an episode. */
export const EpisodeFooterActionMenu = ({
  actions,
  episodes,
  viewDetailsHref,
  onSuccess,
}: EpisodeFooterActionMenuProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);

  const [workflowActions, otherActions] = partition(actions, ({ id }) =>
    WORKFLOW_ACTION_IDS.has(id)
  );

  const toMenuItem = (action: EpisodeAction): EuiContextMenuPanelItemDescriptor => ({
    name: action.displayName,
    icon: action.iconType,
    'data-test-subj': `alertingV2EpisodeTakeAction-${action.id}`,
    onClick: () => {
      closePopover();
      action.execute({ episodes, onSuccess });
    },
  });

  const viewDetailsGroup: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: i18n.FLYOUT_VIEW_DETAILS,
      icon: 'eye',
      href: viewDetailsHref,
      'data-test-subj': 'alertingV2EpisodeTakeAction-viewDetails',
    },
  ];

  const nonEmptyGroups = [
    viewDetailsGroup,
    workflowActions.map(toMenuItem),
    otherActions.map(toMenuItem),
  ].filter((group) => group.length > 0);

  const items = nonEmptyGroups.reduce<EuiContextMenuPanelItemDescriptor[]>(
    (acc, group, index) =>
      index === 0
        ? [...acc, ...group]
        : [...acc, { isSeparator: true as const, key: `separator-${index}` }, ...group],
    []
  );

  const panels: EuiContextMenuPanelDescriptor[] = [{ id: 0, items }];

  return (
    <EuiPopover
      aria-label={i18n.FLYOUT_TAKE_ACTION}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="upRight"
      panelPaddingSize="s"
      data-test-subj="alertingV2EpisodeFlyoutTakeAction"
      button={
        <EuiButton
          fill
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={togglePopover}
          data-test-subj="alertingV2EpisodeFlyoutTakeActionButton"
        >
          {i18n.FLYOUT_TAKE_ACTION}
        </EuiButton>
      }
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
