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
import { css } from '@emotion/react';
import { AlertEpisodeAcknowledgeActionButton } from './acknowledge_action_button';
import { AlertEpisodeSnoozeActionButton } from './snooze_action_button';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import { AlertEpisodeResolveActionButton } from './resolve_action_button';
import { AlertEpisodeViewDetailsActionButton } from './view_details_action_button';

export interface AlertEpisodeActionsProps {
  episodeId?: string;
  groupHash?: string;
  episodeAction?: EpisodeActionState;
  groupAction?: AlertEpisodeGroupAction;
  /**
   * When set, "View details" is an anchor link (pass a base-path-prefixed app URL from the embedding plugin).
   */
  viewDetailsHref?: string;
  /**
   * When true (default), action buttons use bordered `EuiButton` with `fill={false}`.
   * Set to false for contexts where borderless text-style actions fit better (`EuiButtonEmpty`).
   */
  buttonsOutlined?: boolean;
  http: HttpStart;
}

/**
 * Container for episode action buttons (view details, acknowledge, snooze, etc.).
 *
 * When adding a new action button, use {@link EpisodeActionButton} (from
 * `./episode_action_button`) instead of importing `EuiButton` / `EuiButtonEmpty`
 * directly. `EpisodeActionButton` centralises the outlined-vs-borderless
 * rendering driven by the `buttonsOutlined` prop, keeping all action buttons
 * visually consistent.
 */
export function AlertEpisodeActions({
  episodeId,
  groupHash,
  episodeAction,
  groupAction,
  http,
  viewDetailsHref,
  buttonsOutlined = true,
}: AlertEpisodeActionsProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={true}
      alignItems="center"
      justifyContent="flexEnd"
    >
      {viewDetailsHref ? (
        <EuiFlexItem grow={false}>
          <AlertEpisodeViewDetailsActionButton
            href={viewDetailsHref}
            buttonsOutlined={buttonsOutlined}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <AlertEpisodeAcknowledgeActionButton
          lastAckAction={episodeAction?.lastAckAction}
          episodeId={episodeId}
          groupHash={groupHash}
          http={http}
          buttonsOutlined={buttonsOutlined}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AlertEpisodeSnoozeActionButton
          lastSnoozeAction={groupAction?.lastSnoozeAction}
          groupHash={groupHash}
          http={http}
          buttonsOutlined={buttonsOutlined}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.translate('xpack.alertingV2.episodesUi.actions.moreActionsAriaLabel', {
            defaultMessage: 'More actions',
          })}
          display="inline-flex"
          css={css`
            align-items: center;
          `}
          button={
            <EuiButtonIcon
              display="empty"
              color="text"
              size="xs"
              iconType="boxesHorizontal"
              aria-label={i18n.translate(
                'xpack.alertingV2.episodesUi.actions.moreActionsAriaLabel',
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
            <AlertEpisodeResolveActionButton
              lastDeactivateAction={groupAction?.lastDeactivateAction}
              groupHash={groupHash}
              http={http}
            />
          </EuiListGroup>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
