/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiButtonIcon, EuiToolTip, EuiIcon } from '@elastic/eui';
import React from 'react';

import { ACTION_COLUMN_WIDTH } from './common_styles';
import { DeleteTimelineModalButton } from '../delete_timeline_modal';
import * as i18n from '../translations';
import {
  ActionTimelineToShow,
  DeleteTimelines,
  OnOpenTimeline,
  OpenTimelineResult,
} from '../types';

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
}) => {
  const openAsDuplicateColumn = {
    name: i18n.OPEN_AS_DUPLICATE,
    icon: <EuiIcon type="copy" size="s" />,
    // onClick: () => {
    //   onOpenTimeline({
    //     duplicate: true,
    //     timelineId: `${timelineResult.savedObjectId}`,
    //   });
    // },
    // render: (savedObjectId: string, timelineResult: OpenTimelineResult) => (
    //   <EuiToolTip content={i18n.OPEN_AS_DUPLICATE}>
    //     <EuiButtonIcon
    //       aria-label={i18n.OPEN_AS_DUPLICATE}
    //       data-test-subj="open-duplicate"
    //       isDisabled={savedObjectId == null}
    //       iconSize="s"
    //       iconType="copy"
    //       onClick={() =>
    //         onOpenTimeline({
    //           duplicate: true,
    //           timelineId: `${timelineResult.savedObjectId}`,
    //         })
    //       }
    //       size="s"
    //     />
    //   </EuiToolTip>
    // ),
    // sortable: false,
    // width: ACTION_COLUMN_WIDTH,
  };

  const deleteTimelineColumn = {
    name: i18n.DELETE,
    icon: <EuiIcon type="trash" size="s" />,
    // render: (savedObjectId: string, { title }: OpenTimelineResult) => (
    //   <DeleteTimelineModalButton
    //     deleteTimelines={deleteTimelines}
    //     savedObjectId={savedObjectId}
    //     title={title}
    //   />
    // ),
    // sortable: false,
    // width: ACTION_COLUMN_WIDTH,
  };

  return [
    {
      id: 0,
      title: '',
      items: [
        actionTimelineToShow.includes('duplicate') ? openAsDuplicateColumn : null,
        actionTimelineToShow.includes('delete') && deleteTimelines != null
          ? deleteTimelineColumn
          : null,
      ].filter(action => action != null),
    },
  ];
};
