/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import * as React from 'react';

import { ACTION_COLUMN_WIDTH } from './common_styles';
import { DeleteTimelineModalButton } from '../delete_timeline_modal';
import * as i18n from '../translations';
import { DeleteTimelines, OnOpenTimeline, OpenTimelineResult } from '../types';

/**
 * Returns the action columns (e.g. delete, open duplicate timeline)
 */
export const getActionsColumns = ({
  onOpenTimeline,
  deleteTimelines,
  showDeleteAction,
}: {
  deleteTimelines?: DeleteTimelines;
  onOpenTimeline: OnOpenTimeline;
  showDeleteAction: boolean;
}) => {
  const openAsDuplicateColumn = {
    align: 'center',
    field: 'savedObjectId',
    name: '',
    render: (savedObjectId: string, timelineResult: OpenTimelineResult) => (
      <EuiToolTip content={i18n.OPEN_AS_DUPLICATE}>
        <EuiButtonIcon
          aria-label={i18n.OPEN_AS_DUPLICATE}
          data-test-subj="open-duplicate"
          isDisabled={savedObjectId == null}
          iconSize="s"
          iconType="copy"
          onClick={() =>
            onOpenTimeline({
              duplicate: true,
              timelineId: `${timelineResult.savedObjectId}`,
            })
          }
          size="s"
        />
      </EuiToolTip>
    ),
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  };

  const deleteTimelineColumn = {
    align: 'center',
    field: 'savedObjectId',
    name: '',
    render: (savedObjectId: string, { title }: OpenTimelineResult) => (
      <DeleteTimelineModalButton
        deleteTimelines={deleteTimelines}
        savedObjectId={savedObjectId}
        title={title}
      />
    ),
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  };

  return showDeleteAction && deleteTimelines != null
    ? [openAsDuplicateColumn, deleteTimelineColumn]
    : [openAsDuplicateColumn];
};
