/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Action } from 'redux';
import { TimelineModel } from './model';

export interface AutoSavedWarningMsg {
  timelineId: string | null;
  newTimelineModel: TimelineModel | null;
}

/** A map of id to timeline  */
export interface TimelineById {
  [id: string]: TimelineModel;
}

export const EMPTY_TIMELINE_BY_ID: TimelineById = {}; // stable reference

/** The state of all timelines is stored here */
export interface TimelineState {
  timelineById: TimelineById;
  autoSavedWarningMsg: AutoSavedWarningMsg;
  showCallOutUnauthorizedMsg: boolean;
}

// Types of Timelines for determining default columnHeaders
export const DEFAULT = 'timeline';
export const EVENTS_VIEWER = 'events-viewer';
export const SIGNALS_VIEWER = 'signals-viewer';
export type TimelineType = typeof DEFAULT | typeof EVENTS_VIEWER | typeof SIGNALS_VIEWER;

export interface ActionTimeline extends Action<string> {
  payload: {
    id: string;
    eventId: string;
    noteId: string;
  };
}
