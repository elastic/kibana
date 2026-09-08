/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback } from 'react';

import { EPISODE_ASSIGNEE_PANEL_WIDTH, EpisodeAssigneePanel } from './episode_assignee_panel';
import * as i18n from './translations';

export interface EditEpisodeAssigneeModalProps {
  /** Current assignee, or `null` for bulk where there is no shared value. */
  assigneeUid: string | null | undefined;
  /** Number of episodes the change will apply to. Defaults to 1. */
  episodeCount?: number;
  onClose: () => void;
  /** Called with the picked uid (or `null` to clear) once Apply is pressed. */
  onApply: (uid: string | null) => void;
}

/**
 * Assignee picker for surfaces with no element to anchor a popover to, such as
 * the bulk actions menu, whose items are rendered by the data table itself.
 */
export const EditEpisodeAssigneeModal = ({
  assigneeUid,
  episodeCount = 1,
  onClose,
  onApply,
}: EditEpisodeAssigneeModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'alertingV2EditEpisodeAssigneeModalTitle' });

  const handleApply = useCallback(
    (uid: string | null) => {
      onApply(uid);
      onClose();
    },
    [onApply, onClose]
  );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      aria-label={i18n.ASSIGNEE_PANEL_MODAL_ARIA_LABEL(episodeCount)}
      data-test-subj="alertingV2EditEpisodeAssigneeModal"
      maxWidth={EPISODE_ASSIGNEE_PANEL_WIDTH}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId} size="s">
          {i18n.ASSIGNEE_PANEL_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EpisodeAssigneePanel
          assigneeUid={assigneeUid}
          episodeCount={episodeCount}
          onApply={handleApply}
        />
      </EuiModalBody>
    </EuiModal>
  );
};
