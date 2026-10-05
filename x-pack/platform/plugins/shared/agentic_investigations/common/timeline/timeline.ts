/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { investigationEvidenceSchema, MAX_EVIDENCE_SHORT_TEXT_LENGTH } from '../evidence/evidence';
import { userSchema } from '../user';
import { MAX_TIMELINE_EVENTS, TIMELINE_EVENT_TYPES } from './constants';

const MAX_ID_LENGTH = 256;
const MAX_TIMESTAMP_LENGTH = 64;

export const timelineEventTypeSchema = z.enum(TIMELINE_EVENT_TYPES);
export type TimelineEventType = z.infer<typeof timelineEventTypeSchema>;

/** One event on the investigation's time axis, with the evidence that places it there. */
export const timelineEventSchema = z.object({
  /** When it happened, ISO 8601. */
  timestamp: z.iso.datetime({ offset: true }),
  /** When it ended, for an event that lasted (an outage window, a rollout). ISO 8601. */
  end_timestamp: z.iso.datetime({ offset: true }).optional(),
  /** What happened, in one line. */
  title: z.string().min(1).max(MAX_EVIDENCE_SHORT_TEXT_LENGTH),
  type: timelineEventTypeSchema,
  /** The service, host, or component the event happened on. */
  entity: z.string().max(MAX_EVIDENCE_SHORT_TEXT_LENGTH).optional(),
  /** What places the event: a description, a chart, or both. */
  evidence: investigationEvidenceSchema.optional(),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const timelineEventsSchema = z.array(timelineEventSchema).max(MAX_TIMELINE_EVENTS);

/** Stored timeline document: the full current list of events, replaced on every write. */
export const investigationTimelineSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  conversationId: z.string().max(MAX_ID_LENGTH),
  events: timelineEventsSchema,
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: userSchema.optional(),
  updatedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
});
export type InvestigationTimeline = z.infer<typeof investigationTimelineSchema>;

/** The events in time order; events at the same time keep the order the agent sent them in. */
export const sortTimelineEvents = (events: readonly TimelineEvent[]): TimelineEvent[] =>
  events
    .map((event, index) => ({ event, index, time: Date.parse(event.timestamp) }))
    .sort((a, b) => a.time - b.time || a.index - b.index)
    .map(({ event }) => event);
