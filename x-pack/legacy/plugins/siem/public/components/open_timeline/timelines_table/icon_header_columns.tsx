/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiIcon,
  EuiToolTip,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import React, { useState, useCallback } from 'react';

import { ACTION_COLUMN_WIDTH } from './common_styles';
import { getNotesCount, getPinnedEventCount } from '../helpers';
import * as i18n from '../translations';
import { FavoriteTimelineResult, OpenTimelineResult } from '../types';

const EditTimelineActions = React.memo<{
  actionsColumns: EuiContextMenuPanelDescriptor[] | undefined;
}>(({ actionsColumns }) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const tooglePopover = useCallback(
    (newState: boolean) => {
      setPopover(newState);
    },
    [setPopover]
  );
  return (
    <EuiPopover
      anchorPosition="upCenter"
      button={
        <EuiButtonIcon
          aria-label={'All Actions'}
          data-test-subj="edit-timeline-all-actions"
          iconType="boxesHorizontal"
          onClick={tooglePopover.bind(null, !isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={tooglePopover.bind(null, false)}
    >
      <EuiContextMenu initialPanelId={0} panels={actionsColumns} />
    </EuiPopover>
  );
});

EditTimelineActions.displayName = 'EditTimelineActions';
/**
 * Returns the columns that have icon headers
 */
export const getIconHeaderColumns = (
  actionsColumns: EuiContextMenuPanelDescriptor[] | undefined
) => [
  {
    align: 'center',
    field: 'pinnedEventIds',
    name: (
      <EuiToolTip content={i18n.PINNED_EVENTS}>
        <EuiIcon data-test-subj="pinned-event-header-icon" size="m" type="pin" />
      </EuiToolTip>
    ),
    render: (_: Record<string, boolean> | null | undefined, timelineResult: OpenTimelineResult) => (
      <span data-test-subj="pinned-event-count">{`${getPinnedEventCount(timelineResult)}`}</span>
    ),
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  },
  {
    align: 'center',
    field: 'eventIdToNoteIds',
    name: (
      <EuiToolTip content={i18n.NOTES}>
        <EuiIcon data-test-subj="notes-count-header-icon" size="m" type="editorComment" />
      </EuiToolTip>
    ),
    render: (
      _: Record<string, string[]> | null | undefined,
      timelineResult: OpenTimelineResult
    ) => <span data-test-subj="notes-count">{getNotesCount(timelineResult)}</span>,
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  },
  {
    align: 'center',
    field: 'favorite',
    name: (
      <EuiToolTip content={i18n.FAVORITES}>
        <EuiIcon data-test-subj="favorites-header-icon" size="m" type="starEmpty" />
      </EuiToolTip>
    ),
    render: (favorite: FavoriteTimelineResult[] | null | undefined) => {
      const isFavorite = favorite != null && favorite.length > 0;
      const fill = isFavorite ? 'starFilled' : 'starEmpty';

      return <EuiIcon data-test-subj={`favorite-${fill}-star`} type={fill} size="m" />;
    },
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  },
  {
    align: 'center',
    field: 'visControls',
    name: (
      <EuiToolTip content={i18n.ALL_ACTIONS}>
        <EuiIcon data-test-subj="all-timeline-actions-icon" size="m" type="visControls" />
      </EuiToolTip>
    ),
    render: () => {
      return <EditTimelineActions actionsColumns={actionsColumns} />;
      // return <span>xxx</span>;
    },
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  },
];
