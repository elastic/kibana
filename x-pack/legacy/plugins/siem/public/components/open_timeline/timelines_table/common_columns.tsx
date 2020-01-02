/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiLink } from '@elastic/eui';
import { omit } from 'lodash/fp';
import * as React from 'react';

import { ACTION_COLUMN_WIDTH } from './common_styles';
import { isUntitled } from '../helpers';
import { NotePreviews } from '../note_previews';
import * as i18n from '../translations';
import { OnOpenTimeline, OnToggleShowNotes, OpenTimelineResult } from '../types';
import { getEmptyTagValue } from '../../empty_value';
import { FormattedRelativePreferenceDate } from '../../formatted_date';

/**
 * Returns the column definitions (passed as the `columns` prop to
 * `EuiBasicTable`) that are common to the compact `Open Timeline` modal view,
 * and the full view shown in the `All Timelines` view of the `Timelines` page
 */
export const getCommonColumns = ({
  itemIdToExpandedNotesRowMap,
  onOpenTimeline,
  onToggleShowNotes,
}: {
  onOpenTimeline: OnOpenTimeline;
  onToggleShowNotes: OnToggleShowNotes;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
}) => [
  {
    isExpander: true,
    render: ({ notes, savedObjectId }: OpenTimelineResult) =>
      notes != null && notes.length > 0 && savedObjectId != null ? (
        <EuiButtonIcon
          data-test-subj="expand-notes"
          onClick={() =>
            itemIdToExpandedNotesRowMap[savedObjectId] != null
              ? onToggleShowNotes(omit(savedObjectId, itemIdToExpandedNotesRowMap))
              : onToggleShowNotes({
                  ...itemIdToExpandedNotesRowMap,
                  [savedObjectId]: <NotePreviews notes={notes} />,
                })
          }
          aria-label={itemIdToExpandedNotesRowMap[savedObjectId] ? i18n.COLLAPSE : i18n.EXPAND}
          iconType={itemIdToExpandedNotesRowMap[savedObjectId] ? 'arrowDown' : 'arrowRight'}
        />
      ) : null,
    width: ACTION_COLUMN_WIDTH,
  },
  {
    dataType: 'string',
    field: 'title',
    name: i18n.TIMELINE_NAME,
    render: (title: string, timelineResult: OpenTimelineResult) =>
      timelineResult.savedObjectId != null ? (
        <EuiLink
          data-test-subj={`title-${timelineResult.savedObjectId}`}
          onClick={() =>
            onOpenTimeline({
              duplicate: false,
              timelineId: `${timelineResult.savedObjectId}`,
            })
          }
        >
          {isUntitled(timelineResult) ? i18n.UNTITLED_TIMELINE : title}
        </EuiLink>
      ) : (
        <div data-test-subj={`title-no-saved-object-id-${title || 'no-title'}`}>
          {isUntitled(timelineResult) ? i18n.UNTITLED_TIMELINE : title}
        </div>
      ),
    sortable: false,
  },
  {
    dataType: 'string',
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: string) => (
      <span data-test-subj="description">
        {description != null && description.trim().length > 0 ? description : getEmptyTagValue()}
      </span>
    ),
    sortable: false,
  },
  {
    dataType: 'date',
    field: 'updated',
    name: i18n.LAST_MODIFIED,
    render: (date: number, timelineResult: OpenTimelineResult) => (
      <div data-test-subj="updated">
        {timelineResult.updated != null ? (
          <FormattedRelativePreferenceDate value={date} />
        ) : (
          getEmptyTagValue()
        )}
      </div>
    ),
    sortable: true,
  },
];
