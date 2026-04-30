/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeAction } from '../actions/types';

const PRIMARY_ACTION_IDS = new Set([
  'ALERTING_V2_ACK_EPISODE',
  'ALERTING_V2_UNACK_EPISODE',
  'ALERTING_V2_SNOOZE_EPISODE',
  'ALERTING_V2_UNSNOOZE_EPISODE',
]);

export interface EpisodeActionsBarProps {
  /** Already filtered to compatible. Bar does not re-filter. */
  actions: EpisodeAction[];
  episodes: AlertEpisode[];
  onSuccess?: () => void;
}

export const EpisodeActionsBar = ({ actions, episodes, onSuccess }: EpisodeActionsBarProps) => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  const primaryActions = actions.filter((a) => PRIMARY_ACTION_IDS.has(a.id));
  const overflowActions = actions.filter((a) => !PRIMARY_ACTION_IDS.has(a.id));

  const handlePrimaryClick = (action: EpisodeAction) => {
    action.execute({ episodes, onSuccess });
  };

  const handleOverflowClick = (action: EpisodeAction) => {
    setIsOverflowOpen(false);
    action.execute({ episodes, onSuccess });
  };

  return (
    <div data-test-subj="episodeActionsBar">
      {primaryActions.length > 0 &&
        primaryActions.map((action) => (
          <EuiButtonEmpty
            key={action.id}
            iconType={action.iconType}
            color="text"
            size="s"
            data-test-subj={`episodeActionsBar-primary-${action.id}`}
            onClick={() => handlePrimaryClick(action)}
          >
            {action.displayName}
          </EuiButtonEmpty>
        ))}
      {overflowActions.length > 0 && (
        <EuiPopover
          data-test-subj="episodeActionsBar-overflow"
          isOpen={isOverflowOpen}
          closePopover={() => setIsOverflowOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downRight"
          aria-label={i18n.translate(
            'xpack.alertingV2EpisodesUi.episodeActionsBar.moreActionsPopoverAriaLabel',
            { defaultMessage: 'More actions' }
          )}
          button={
            <EuiButtonIcon
              iconType="boxesHorizontal"
              color="text"
              aria-label="More actions"
              data-test-subj="episodeActionsBar-overflow-trigger"
              onClick={() => setIsOverflowOpen((open) => !open)}
            />
          }
        >
          <EuiContextMenuPanel
            size="s"
            items={overflowActions.map((action) => (
              <EuiContextMenuItem
                key={action.id}
                icon={<EuiIcon type={action.iconType} size="m" aria-hidden={true} />}
                data-test-subj={`episodeActionsBar-overflow-${action.id}`}
                onClick={() => handleOverflowClick(action)}
              >
                {action.displayName}
              </EuiContextMenuItem>
            ))}
          />
        </EuiPopover>
      )}
    </div>
  );
};
