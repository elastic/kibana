/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiListGroup, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import { AcknowledgeActionButton } from './acknowledge_action_button';
import { SnoozeActionButton } from './snooze_action_button';
import type { EpisodeAction } from '../../../types/episode_action';
import { ResolveActionButton } from './deactivate_action_button';

export interface AlertEpisodeActionsCellProps {
  episodeAction?: EpisodeAction;
  http: HttpStart;
}

export function AlertEpisodeActionsCell({ episodeAction, http }: AlertEpisodeActionsCellProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={true}
      alignItems="center"
      justifyContent="flexEnd"
    >
      <EuiFlexItem grow={false}>
        <AcknowledgeActionButton
          lastAckAction={episodeAction?.lastAckAction}
          episodeId={episodeAction?.episodeId}
          groupHash={episodeAction?.groupHash}
          http={http}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SnoozeActionButton
          lastSnoozeAction={episodeAction?.lastSnoozeAction}
          groupHash={episodeAction?.groupHash}
          http={http}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.translate(
            'xpack.alertingV2.episodesUi.actionsCell.moreActionsAriaLabel',
            {
              defaultMessage: 'More actions',
            }
          )}
          button={
            <EuiButtonIcon
              display="empty"
              color="text"
              size="xs"
              iconType="boxesHorizontal"
              aria-label={i18n.translate(
                'xpack.alertingV2.episodesUi.actionsCell.moreActionsAriaLabel',
                {
                  defaultMessage: 'More actions',
                }
              )}
              onClick={() => setIsMoreOpen((open) => !open)}
              data-test-subj="alertingEpisodeActionsMoreButton"
            />
          }
          isOpen={isMoreOpen}
          closePopover={() => setIsMoreOpen(false)}
          anchorPosition="downLeft"
          panelPaddingSize="s"
        >
          <EuiListGroup gutterSize="none" bordered={false} flush={true} size="l">
            <ResolveActionButton
              lastDeactivateAction={episodeAction?.lastDeactivateAction}
              groupHash={episodeAction?.groupHash}
              http={http}
            />
          </EuiListGroup>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
