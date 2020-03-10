/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';

import {
  ActionTimelineToShow,
  DeleteTimelines,
  OnOpenTimeline,
  OpenTimelineResult,
  TimelineActionsOverflowColumns,
} from '../types';
import * as i18n from '../translations';
import { DeleteTimelineModalButton } from '../delete_timeline_modal';
import { TimelineDownloader } from '../export_timeline/export_timeline';
/**
 * Returns the action columns (e.g. delete, open duplicate timeline)
 */
export const getActionsColumns = ({
  actionTimelineToShow,
  onOpenTimeline,
  deleteTimelines,
}: {
  actionTimelineToShow: ActionTimelineToShow[];
  deleteTimelines?: DeleteTimelines;
  onOpenTimeline: OnOpenTimeline;
}): [TimelineActionsOverflowColumns] => {
  const openAsDuplicateColumn = {
    name: i18n.OPEN_AS_DUPLICATE,
    icon: 'copy',
    onClick: ({ savedObjectId }: OpenTimelineResult) => {
      onOpenTimeline({
        duplicate: true,
        timelineId: savedObjectId ?? '',
      });
    },
    description: i18n.OPEN_AS_DUPLICATE,
  };

  const exportTimelineAction = {
    name: i18n.EXPORT_SELECTED,
    icon: 'exportAction',
    render: (selectedTimeline: OpenTimelineResult) => (
      <TimelineDownloader selectedTimelines={[selectedTimeline]} />
    ),
    description: i18n.EXPORT_SELECTED,
  };

  const deleteTimelineColumn = {
    name: i18n.DELETE_SELECTED,
    render: ({ savedObjectId, title }: OpenTimelineResult) => (
      <DeleteTimelineModalButton
        deleteTimelines={deleteTimelines}
        savedObjectId={savedObjectId}
        title={title}
      />
    ),
    description: i18n.DELETE_SELECTED,
  };

  return [
    {
      width: '40px',
      actions: [
        actionTimelineToShow.includes('duplicate') ? openAsDuplicateColumn : null,
        actionTimelineToShow.includes('export') ? exportTimelineAction : null,
        actionTimelineToShow.includes('delete') && deleteTimelines != null
          ? deleteTimelineColumn
          : null,
      ].filter(action => action != null),
    },
  ];
};
