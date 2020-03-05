/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiButtonIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';
import { OnInsertTimeline, InsertTimelineResult } from '../types';
import { isUntitled } from '../helpers';

/**
 * Returns the columns
 */
export const getColumns = ({ onInsertTimeline }: { onInsertTimeline: OnInsertTimeline }) => [
  {
    name: '',
    dataType: 'string',
    field: 'title',
    render: (title: string, timelineResult: InsertTimelineResult) =>
      timelineResult.savedObjectId != null ? (
        <EuiLink
          data-test-subj={`title-${timelineResult.savedObjectId}`}
          onClick={() =>
            onInsertTimeline({
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
    name: '',
    align: 'center',
    field: 'savedObjectId',
    render: (savedObjectId: string, timelineResult: InsertTimelineResult) => (
      <EuiToolTip content={i18n.INSERT_TIMELINE}>
        <EuiButtonIcon
          aria-label={i18n.INSERT_TIMELINE}
          data-test-subj="open-duplicate"
          isDisabled={savedObjectId == null}
          iconSize="s"
          iconType="copy"
          onClick={() =>
            onInsertTimeline({
              duplicate: true,
              timelineId: `${timelineResult.savedObjectId}`,
            })
          }
          size="s"
        />
      </EuiToolTip>
    ),
    sortable: false,
    width: '40px',
  },
];
