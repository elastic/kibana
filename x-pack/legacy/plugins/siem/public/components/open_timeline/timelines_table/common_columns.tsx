/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import { EuiButtonIcon, EuiLink } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { FormattedDate } from '../../formatted_date';
import { getEmptyTagValue } from '../../empty_value';
import { isUntitled } from '../helpers';
import { NotePreviews } from '../note_previews';
import { OnOpenTimeline, OnToggleShowNotes, OpenTimelineResult } from '../types';

import * as i18n from '../translations';

/** the width of the description column when showing extended columns */
export const EXTENDED_COLUMNS_DESCRIPTION_WIDTH = '30%';

export const DESCRIPTION_WIDTH = '45%';

const ExpandButtonContainer = styled.div`
  position: relative;
  top -4px;
`;

/**
 * Returns the column definitions (passed as the `columns` prop to
 * `EuiBasicTable`) that are common to the compact `Open Timeline` modal view,
 * and the full view shown in the `All Timelines` view of the `Timelines` page
 */
export const getCommonColumns = ({
  itemIdToExpandedNotesRowMap,
  onOpenTimeline,
  onToggleShowNotes,
  showExtendedColumnsAndActions,
}: {
  onOpenTimeline: OnOpenTimeline;
  onToggleShowNotes: OnToggleShowNotes;
  showExtendedColumnsAndActions: boolean;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
}) => [
  {
    isExpander: true,
    render: ({ notes, savedObjectId }: OpenTimelineResult) =>
      notes != null && notes.length > 0 && savedObjectId != null ? (
        <ExpandButtonContainer>
          <EuiButtonIcon
            data-test-subj="expand-notes"
            onClick={() =>
              itemIdToExpandedNotesRowMap[savedObjectId] != null
                ? onToggleShowNotes(omit(savedObjectId, itemIdToExpandedNotesRowMap))
                : onToggleShowNotes({
                    ...itemIdToExpandedNotesRowMap,
                    [savedObjectId]: (
                      <NotePreviews notes={notes} isModal={!showExtendedColumnsAndActions} />
                    ),
                  })
            }
            aria-label={itemIdToExpandedNotesRowMap[savedObjectId] ? i18n.COLLAPSE : i18n.EXPAND}
            iconType={itemIdToExpandedNotesRowMap[savedObjectId] ? 'arrowDown' : 'arrowRight'}
          />
        </ExpandButtonContainer>
      ) : null,
    width: '32px',
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
    width: showExtendedColumnsAndActions ? EXTENDED_COLUMNS_DESCRIPTION_WIDTH : DESCRIPTION_WIDTH,
  },
  {
    dataType: 'date',
    field: 'updated',
    name: i18n.LAST_MODIFIED,
    render: (date: number, timelineResult: OpenTimelineResult) => (
      <div data-test-subj="updated">
        {timelineResult.updated != null ? (
          <FormattedDate fieldName="" value={date} />
        ) : (
          getEmptyTagValue()
        )}
      </div>
    ),
    sortable: true,
  },
];
