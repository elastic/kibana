/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { css } from '@emotion/react';
import { AlertEpisodeAcknowledgeActionButton } from './acknowledge_action_button';
import { AlertEpisodeSnoozeActionButton } from './snooze_action_button';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import { AlertEpisodeTagsFlyout } from './edit_episode_tags_flyout';
import { EditEpisodeAssigneeFlyout } from './edit_episode_assignee_flyout';
import { AlertEpisodeResolveActionButton } from './resolve_action_button';
import { AlertEpisodeTagsMenuItem } from './tags_action_button';
import { AlertEpisodeViewDetailsActionButton } from './view_details_action_button';
import * as i18n from './translations';

export interface AlertEpisodeActionsProps {
  episodeId?: string;
  groupHash?: string;
  episodeAction?: EpisodeActionState;
  groupAction?: AlertEpisodeGroupAction;
  /** Latest assignee profile uid for this episode (from episode actions). */
  lastAssigneeUid?: string | null;
  /**
   * When set, "Open in Discover" appears in the more-actions menu (the rule query must exist).
   */
  openInDiscoverHref?: string;
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
  /** Required for Edit Tags (ES|QL tag suggestions). */
  expressions: ExpressionsStart;
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
  openInDiscoverHref,
  expressions,
  viewDetailsHref,
  lastAssigneeUid,
  buttonsOutlined = true,
}: AlertEpisodeActionsProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isTagsFlyoutOpen, setIsTagsFlyoutOpen] = useState(false);
  const [isAssigneeFlyoutOpen, setIsAssigneeFlyoutOpen] = useState(false);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={false}
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
        <>
          <EuiPopover
            aria-label={i18n.ACTIONS_MORE_ACTIONS_ARIA_LABEL}
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
                aria-label={i18n.ACTIONS_MORE_ACTIONS_ARIA_LABEL}
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
              <AlertEpisodeTagsMenuItem
                isDisabled={!groupHash}
                onOpen={() => {
                  setIsMoreOpen(false);
                  setIsTagsFlyoutOpen(true);
                }}
              />
              {episodeId && groupHash ? (
                <EuiListGroupItem
                  label={i18n.ACTIONS_EDIT_ASSIGNEE_LABEL}
                  size="s"
                  iconType="user"
                  onClick={() => {
                    setIsMoreOpen(false);
                    setIsAssigneeFlyoutOpen(true);
                  }}
                  data-test-subj="alertingEpisodeActionsEditAssigneeButton"
                />
              ) : null}
              {openInDiscoverHref && (
                <EuiListGroupItem
                  label={i18n.ACTIONS_OPEN_IN_DISCOVER_LABEL}
                  size="s"
                  iconType="discoverApp"
                  href={openInDiscoverHref}
                  onClick={() => setIsMoreOpen(false)}
                  data-test-subj="alertingEpisodeOpenInDiscoverButton"
                />
              )}
            </EuiListGroup>
          </EuiPopover>
          {isTagsFlyoutOpen && groupHash ? (
            <AlertEpisodeTagsFlyout
              isOpen={isTagsFlyoutOpen}
              onClose={() => setIsTagsFlyoutOpen(false)}
              groupHash={groupHash}
              currentTags={groupAction?.tags ?? []}
              http={http}
              services={{ expressions }}
            />
          ) : null}
          {isAssigneeFlyoutOpen && episodeId && groupHash ? (
            <EditEpisodeAssigneeFlyout
              episodeId={episodeId}
              groupHash={groupHash}
              lastAssigneeUid={lastAssigneeUid}
              onClose={() => setIsAssigneeFlyoutOpen(false)}
            />
          ) : null}
        </>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
