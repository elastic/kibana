/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Attachment type identifier registered with Agent Builder. */
export const TIMELINE_ATTACHMENT_TYPE = 'investigation_timeline' as const;

/** One document per space and conversation. See README "Index naming". */
export const TIMELINE_INDEX_NAME = '.kibana-investigation-timeline' as const;

/** Events one timeline holds. */
export const MAX_TIMELINE_EVENTS = 50;

/** What an event on the timeline is. */
export const TIMELINE_EVENT_TYPES = [
  'change',
  'symptom',
  'detection',
  'action',
  'recovery',
  'other',
] as const;

/** Agent Builder builtin tool that records an investigation's timeline. */
export const SET_TIMELINE_TOOL_ID = 'investigations.set_timeline' as const;
