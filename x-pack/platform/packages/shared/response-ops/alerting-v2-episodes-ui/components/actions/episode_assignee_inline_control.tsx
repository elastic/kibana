/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UserProfileService } from '@kbn/core-user-profile-browser';

import { AlertEpisodeAssigneeCell } from '../assignee_cell';
import { EPISODE_ASSIGNEE_PANEL_WIDTH, EpisodeAssigneePanel } from './episode_assignee_panel';
import * as i18n from './translations';

export interface EpisodeAssigneeInlineControlProps {
  /** Current assignee of the episode, or `null` when there is none. */
  assigneeUid: string | null | undefined;
  /** Resolves the assignee profile for the anchor shown once assigned. */
  userProfile: UserProfileService;
  /** Number of episodes the change will apply to. Defaults to 1. */
  episodeCount?: number;
  /** Disables the anchor, for instance while the episode is still loading. */
  isDisabled?: boolean;
  'data-test-subj'?: string;
  /** Called with the picked uid (or `null` to clear) once Apply is pressed. */
  onApply: (uid: string | null) => void;
}

/**
 * Opens the assignee picker in a popover anchored to itself. Shows a circled plus
 * while the episode is unassigned, and the assignee itself once it has one, so both
 * assigning and reassigning happen in place. Used in the details flyout header.
 */
export const EpisodeAssigneeInlineControl = ({
  assigneeUid,
  userProfile,
  episodeCount,
  isDisabled = false,
  'data-test-subj': dataTestSubj,
  onApply,
}: EpisodeAssigneeInlineControlProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const searchInputId = useGeneratedHtmlId({ prefix: 'alertingV2AssigneeSearch' });

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const handleApply = useCallback(
    (uid: string | null) => {
      setIsOpen(false);
      onApply(uid);
    },
    [onApply]
  );

  const anchor = assigneeUid ? (
    <EuiToolTip content={i18n.ASSIGNEE_CHANGE_BUTTON_TOOLTIP} disableScreenReaderOutput>
      <EuiButtonEmpty
        size="xs"
        flush="both"
        color="text"
        isDisabled={isDisabled}
        data-test-subj={dataTestSubj ?? 'alertingV2EpisodeAssigneeChangeButton'}
        onClick={togglePopover}
      >
        <AlertEpisodeAssigneeCell assigneeUid={assigneeUid} userProfile={userProfile} />
        <EuiScreenReaderOnly>
          <span>{i18n.ASSIGNEE_CHANGE_BUTTON_ARIA_LABEL}</span>
        </EuiScreenReaderOnly>
      </EuiButtonEmpty>
    </EuiToolTip>
  ) : (
    <EuiToolTip content={i18n.ASSIGNEE_ADD_BUTTON_TOOLTIP} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="plusCircle"
        size="xs"
        aria-label={i18n.ASSIGNEE_ADD_BUTTON_ARIA_LABEL}
        isDisabled={isDisabled}
        data-test-subj={dataTestSubj ?? 'alertingV2EpisodeAssigneeAddButton'}
        onClick={togglePopover}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      panelPaddingSize="none"
      anchorPosition="downLeft"
      initialFocus={`[id="${searchInputId}"]`}
      panelStyle={{ minWidth: EPISODE_ASSIGNEE_PANEL_WIDTH }}
      isOpen={isOpen}
      closePopover={closePopover}
      aria-label={i18n.ASSIGNEE_PANEL_TITLE}
      data-test-subj="alertingV2EpisodeAssigneeInlinePopover"
      button={anchor}
    >
      <EpisodeAssigneePanel
        assigneeUid={assigneeUid}
        episodeCount={episodeCount}
        searchInputId={searchInputId}
        onApply={handleApply}
      />
    </EuiPopover>
  );
};
