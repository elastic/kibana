/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get, isEmpty, noop } from 'lodash/fp';

import { BrowserFields } from '../../../containers/source';
import { Ecs } from '../../../graphql/types';
import { OnPinEvent, OnUnPinEvent } from '../events';
import { ColumnHeader } from './column_headers/column_header';
import * as i18n from './translations';

/** The (fixed) width of the Actions column */
export const DEFAULT_ACTIONS_COLUMN_WIDTH = 115; // px;
/**
 * The (fixed) width of the Actions column when the timeline body is used as
 * an events viewer, which has fewer actions than a regular events viewer
 */
export const EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH = 32; // px;
/** Additional column width to include when checkboxes are shown **/
export const SHOW_CHECK_BOXES_COLUMN_WIDTH = 32; // px;
/** The default minimum width of a column (when a width for the column type is not specified) */
export const DEFAULT_COLUMN_MIN_WIDTH = 180; // px
/** The default minimum width of a column of type `date` */
export const DEFAULT_DATE_COLUMN_MIN_WIDTH = 190; // px

export const DEFAULT_TIMELINE_WIDTH = 1100; // px

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const omitTypenameAndEmpty = (k: string, v: any): any | undefined =>
  k !== '__typename' && v != null ? v : undefined;

export const stringifyEvent = (ecs: Ecs): string => JSON.stringify(ecs, omitTypenameAndEmpty, 2);

export const eventHasNotes = (noteIds: string[]): boolean => !isEmpty(noteIds);

export const getPinTooltip = ({
  isPinned,
  // eslint-disable-next-line no-shadow
  eventHasNotes,
}: {
  isPinned: boolean;
  eventHasNotes: boolean;
}) => (isPinned && eventHasNotes ? i18n.PINNED_WITH_NOTES : isPinned ? i18n.PINNED : i18n.UNPINNED);

export interface IsPinnedParams {
  eventId: string;
  pinnedEventIds: Readonly<Record<string, boolean>>;
}

export const eventIsPinned = ({ eventId, pinnedEventIds }: IsPinnedParams): boolean =>
  pinnedEventIds[eventId] === true;

export interface GetPinOnClickParams {
  allowUnpinning: boolean;
  eventId: string;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  isEventPinned: boolean;
}

export const getPinOnClick = ({
  allowUnpinning,
  eventId,
  onPinEvent,
  onUnPinEvent,
  isEventPinned,
}: GetPinOnClickParams): (() => void) => {
  if (!allowUnpinning) {
    return noop;
  }
  return isEventPinned ? () => onUnPinEvent(eventId) : () => onPinEvent(eventId);
};

export const getColumnWidthFromType = (type: string): number =>
  type !== 'date' ? DEFAULT_COLUMN_MIN_WIDTH : DEFAULT_DATE_COLUMN_MIN_WIDTH;

/** Enriches the column headers with field details from the specified browserFields */
export const getColumnHeaders = (
  headers: ColumnHeader[],
  browserFields: BrowserFields
): ColumnHeader[] => {
  return headers.map(header => {
    const splitHeader = header.id.split('.'); // source.geo.city_name -> [source, geo, city_name]

    return {
      ...header,
      ...get(
        [splitHeader.length > 1 ? splitHeader[0] : 'base', 'fields', header.id],
        browserFields
      ),
    };
  });
};

/** Returns the (fixed) width of the Actions column */
export const getActionsColumnWidth = (isEventViewer: boolean, showCheckboxes = false): number =>
  (showCheckboxes ? SHOW_CHECK_BOXES_COLUMN_WIDTH : 0) +
  (isEventViewer ? EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH : DEFAULT_ACTIONS_COLUMN_WIDTH);
