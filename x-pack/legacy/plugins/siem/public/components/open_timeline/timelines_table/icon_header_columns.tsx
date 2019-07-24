/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { ACTION_COLUMN_WIDTH, PositionedIcon } from './common_styles';
import { FavoriteTimelineResult, OpenTimelineResult } from '../types';
import { getNotesCount, getPinnedEventCount } from '../helpers';

import * as i18n from '../translations';

const PinnedIcon = styled(EuiIcon)`
  position: relative;
  left: -3px;
`;

const CommentIcon = styled(EuiIcon)`
  position: relative;
  left: -2px;
`;

/**
 * Returns the columns that have icon headers
 */
export const getIconHeaderColumns = () => [
  {
    field: 'pinnedEventIds',
    name: (
      <EuiToolTip content={i18n.PINNED_EVENTS}>
        <PinnedIcon data-test-subj="pinned-event-header-icon" size="m" color="subdued" type="pin" />
      </EuiToolTip>
    ),
    render: (_: Record<string, boolean> | null | undefined, timelineResult: OpenTimelineResult) => (
      <span data-test-subj="pinned-event-count">{`${getPinnedEventCount(timelineResult)}`}</span>
    ),
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  },
  {
    field: 'eventIdToNoteIds',
    name: (
      <EuiToolTip content={i18n.NOTES}>
        <CommentIcon
          data-test-subj="notes-count-header-icon"
          size="m"
          color="subdued"
          type="editorComment"
        />
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
    field: 'favorite',
    name: (
      <EuiToolTip content={i18n.FAVORITES}>
        <EuiIcon data-test-subj="favorites-header-icon" size="m" color="subdued" type="starEmpty" />
      </EuiToolTip>
    ),
    render: (favorite: FavoriteTimelineResult[] | null | undefined) => {
      const isFavorite = favorite != null && favorite.length > 0;
      const fill = isFavorite ? 'starFilled' : 'starEmpty';

      return (
        <PositionedIcon>
          <EuiIcon data-test-subj={`favorite-${fill}-star`} type={fill} size="m" />
        </PositionedIcon>
      );
    },
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  },
];
