/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';

import {
  EuiIcon,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { ActionTimelineToShow, DeleteTimelines, OnOpenTimeline } from '../types';
import * as i18n from '../translations';
// import { DeleteTimelineModalButton } from '../delete_timeline_modal';
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
}): EuiContextMenuPanelDescriptor[] | undefined => {
  const openAsDuplicateColumn = {
    name: i18n.OPEN_AS_DUPLICATE,
    icon: <EuiIcon type="copy" size="s" />,
  };

  // onClick: () => {
  // onOpenTimeline({
  //   duplicate: true,
  //   timelineId: `${timelineResult.savedObjectId}`,
  // });
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
  const deleteTimelineColumn = {
    name: i18n.DELETE,
    icon: <EuiIcon type="trash" size="s" />,

    // icon: (
    //   <DeleteTimelineModalButton
    //     deleteTimelines={deleteTimelines}
    //     savedObjectId={savedObjectId}
    //     title={'title'}
    //   />
    // ),
    // render: (savedObjectId: string, { title }: OpenTimelineResult) => (
    // <DeleteTimelineModalButton
    //     deleteTimelines={deleteTimelines}
    //     savedObjectId={savedObjectId}
    //     title={title}
    //   />
    // ),
    // sortable: false,
    // width: ACTION_COLUMN_WIDTH,
  };

  const pannelItems = [
    actionTimelineToShow.includes('duplicate') ? openAsDuplicateColumn : null,
    actionTimelineToShow.includes('delete') && deleteTimelines != null
      ? deleteTimelineColumn
      : null,
  ].filter(action => action != null) as EuiContextMenuPanelItemDescriptor[];

  return pannelItems.length > 0
    ? [
        {
          id: 0,
          items: pannelItems,
        },
      ]
    : undefined;
};
