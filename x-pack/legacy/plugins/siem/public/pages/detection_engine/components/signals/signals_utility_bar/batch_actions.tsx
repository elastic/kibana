/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';
import { TimelineNonEcsData } from '../../../../../graphql/types';
import { SendSignalsToTimeline, UpdateSignalsStatus } from '../types';
import { FILTER_CLOSED, FILTER_OPEN } from '../signals_filter_group';

/**
 * Returns ViewInTimeline / UpdateSignalStatus actions to be display within an EuiContextMenuPanel
 *
 * @param areEventsLoading are any events loading
 * @param allEventsSelected are all events on all pages selected
 * @param selectedEventIds
 * @param updateSignalsStatus function for updating signal status
 * @param sendSignalsToTimeline function for sending signals to timeline
 * @param closePopover
 * @param isFilteredToOpen currently selected filter options
 */
export const getBatchItems = (
  areEventsLoading: boolean,
  allEventsSelected: boolean,
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>,
  updateSignalsStatus: UpdateSignalsStatus,
  sendSignalsToTimeline: SendSignalsToTimeline,
  closePopover: () => void,
  isFilteredToOpen: boolean
) => {
  const allDisabled = areEventsLoading || Object.keys(selectedEventIds).length === 0;
  const sendToTimelineDisabled = allEventsSelected || uniqueRuleCount(selectedEventIds) > 1;
  const filterString = isFilteredToOpen
    ? i18n.BATCH_ACTION_CLOSE_SELECTED
    : i18n.BATCH_ACTION_OPEN_SELECTED;

  return [
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_VIEW_SELECTED_IN_TIMELINE}
      icon="editorUnorderedList"
      disabled={allDisabled || sendToTimelineDisabled}
      onClick={async () => {
        closePopover();
        sendSignalsToTimeline();
      }}
    >
      {i18n.BATCH_ACTION_VIEW_SELECTED_IN_TIMELINE}
    </EuiContextMenuItem>,

    <EuiContextMenuItem
      key={filterString}
      icon={isFilteredToOpen ? 'indexClose' : 'indexOpen'}
      disabled={allDisabled}
      onClick={async () => {
        closePopover();
        await updateSignalsStatus({
          signalIds: Object.keys(selectedEventIds),
          status: isFilteredToOpen ? FILTER_CLOSED : FILTER_OPEN,
        });
      }}
    >
      {filterString}
    </EuiContextMenuItem>,
  ];
};

/**
 * Returns the number of unique rules for a given list of signals
 *
 * @param signals
 */
export const uniqueRuleCount = (
  signals: Readonly<Record<string, TimelineNonEcsData[]>>
): number => {
  const ruleIds = Object.values(signals).flatMap(
    data => data.find(d => d.field === 'signal.rule.id')?.value
  );

  return Array.from(new Set(ruleIds)).length;
};
