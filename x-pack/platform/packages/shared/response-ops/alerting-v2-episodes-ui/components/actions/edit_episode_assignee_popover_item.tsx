/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiContextMenuItem, EuiPopover, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { EPISODE_ASSIGNEE_PANEL_WIDTH, EpisodeAssigneePanel } from './episode_assignee_panel';
import * as i18n from './translations';

export interface EditEpisodeAssigneePopoverItemProps {
  /** Current assignee of the episode, or `null` when there is none. */
  assigneeUid: string | null | undefined;
  /** Number of episodes the change will apply to. Defaults to 1. */
  episodeCount?: number;
  label: string;
  iconType: IconType;
  'data-test-subj'?: string;
  /** Called with the picked uid (or `null` to clear) once Apply is pressed. */
  onApply: (uid: string | null) => void;
  /**
   * Closes the menu hosting this item. Called after Apply, so the whole menu
   * tears down in one go rather than leaving a stale parent panel behind.
   */
  closeMenu?: () => void;
}

/**
 * Context menu entry that opens the assignee picker in a nested popover.
 *
 * The item is the popover's own anchor, so it must not be built from a host
 * menu's item component: those close the menu on click, which would unmount the
 * anchor before the popover could show.
 */
export const EditEpisodeAssigneePopoverItem = ({
  assigneeUid,
  episodeCount,
  label,
  iconType,
  'data-test-subj': dataTestSubj = 'alertingV2EditEpisodeAssigneeMenuItem',
  onApply,
  closeMenu,
}: EditEpisodeAssigneePopoverItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const searchInputId = useGeneratedHtmlId({ prefix: 'alertingV2AssigneeSearch' });

  const closePopover = useCallback(() => setIsOpen(false), []);

  const handleApply = useCallback(
    (uid: string | null) => {
      setIsOpen(false);
      closeMenu?.();
      onApply(uid);
    },
    [closeMenu, onApply]
  );

  return (
    <EuiPopover
      display="block"
      panelPaddingSize="none"
      anchorPosition="rightUp"
      initialFocus={`[id="${searchInputId}"]`}
      panelStyle={{ minWidth: EPISODE_ASSIGNEE_PANEL_WIDTH }}
      isOpen={isOpen}
      closePopover={closePopover}
      aria-label={i18n.ASSIGNEE_PANEL_TITLE}
      data-test-subj="alertingV2EditEpisodeAssigneePopover"
      button={
        <EuiContextMenuItem
          icon={iconType}
          hasPanel
          data-test-subj={dataTestSubj}
          onClick={() => setIsOpen((open) => !open)}
        >
          {label}
        </EuiContextMenuItem>
      }
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
