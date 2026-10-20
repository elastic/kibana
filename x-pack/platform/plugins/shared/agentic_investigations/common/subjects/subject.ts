/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_EVIDENCE_TEXT_LENGTH } from '../evidence/evidence';
import { userSchema } from '../user';
import {
  INVESTIGATION_SUBJECT_TRIGGER_TYPES,
  INVESTIGATION_SUBJECT_TYPES,
  MAX_SLACK_SEEN_EVENTS,
  MAX_SUBJECT_ID_LENGTH,
  MAX_SUBJECTS_PER_REQUEST,
} from './constants';

const MAX_ID_LENGTH = 256;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_URL_LENGTH = 2048;
const MAX_SNAPSHOT_KEYS = 50;
const MAX_SNAPSHOT_KEY_LENGTH = 128;
/** Serialized size bound on a snapshot, whose open fields (rule parameters, grouping) are opaque. */
export const MAX_SUBJECT_SNAPSHOT_LENGTH = 64_000;

export const investigationSubjectTypeSchema = z.enum(INVESTIGATION_SUBJECT_TYPES);
export type InvestigationSubjectType = z.infer<typeof investigationSubjectTypeSchema>;

export const investigationSubjectTriggerTypeSchema = z.enum(INVESTIGATION_SUBJECT_TRIGGER_TYPES);
export type InvestigationSubjectTriggerType = z.infer<typeof investigationSubjectTriggerTypeSchema>;

/**
 * Point-in-time copy of an alert, taken by the caller when the investigation started. Loose: the
 * fields a renderer reads are declared with the same bounds as Nightshift's `alertSnapshotSchema`,
 * so every Nightshift snapshot validates, and any other field is kept as is. The key count and the
 * serialized size are bounded because the open fields are opaque.
 */
export const alertSubjectSnapshotSchema = z
  .looseObject({
    /** `kibana.alert.uuid` */
    id: z.string().min(1).max(500).optional(),
    /** `kibana.alert.rule.uuid` */
    rule_id: z.string().min(1).max(500).optional(),
    /** `kibana.alert.rule.name` */
    rule_name: z.string().min(1).max(500).optional(),
    /** `kibana.alert.rule.rule_type_id` */
    rule_type_id: z.string().min(1).max(500).optional(),
    /** `kibana.alert.rule.category` */
    rule_category: z.string().min(1).max(500).optional(),
    /** `kibana.alert.reason` */
    reason: z.string().min(1).max(5000).optional(),
    /** `kibana.alert.status` */
    status: z.string().min(1).max(100).optional(),
    /** `kibana.alert.start` */
    start: z.string().max(100).optional(),
    timestamp: z.string().max(100).optional(),
    /** `kibana.alert.url`: the link the rule type writes, if any (for example a Discover link). */
    url: z.string().max(2000).optional(),
    rule_tags: z.array(z.string().max(500)).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length <= MAX_SNAPSHOT_KEYS, {
    message: `snapshot exceeds ${MAX_SNAPSHOT_KEYS} key limit`,
  })
  .refine((value) => Object.keys(value).every((key) => key.length <= MAX_SNAPSHOT_KEY_LENGTH), {
    message: `snapshot has a key longer than ${MAX_SNAPSHOT_KEY_LENGTH} characters`,
  })
  .refine((value) => JSON.stringify(value).length <= MAX_SUBJECT_SNAPSHOT_LENGTH, {
    message: `snapshot exceeds ${MAX_SUBJECT_SNAPSHOT_LENGTH} characters`,
  });
export type AlertSubjectSnapshot = z.infer<typeof alertSubjectSnapshotSchema>;

/** A delivered Slack event and the run (for example a workflow execution) that handled it. */
export const slackSeenEventSchema = z.object({
  event_id: z.string().min(1).max(MAX_ID_LENGTH),
  execution_id: z.string().min(1).max(MAX_ID_LENGTH),
});
export type SlackSeenEvent = z.infer<typeof slackSeenEventSchema>;

/** Where a `slack_thread` subject lives, and the status message the investigation keeps updated. */
export const slackThreadSubjectSchema = z.object({
  /** Channel id or name, rendered as `#channel`. */
  channel: z.string().min(1).max(MAX_ID_LENGTH),
  thread_ts: z.string().min(1).max(MAX_TIMESTAMP_LENGTH),
  /** The message in the thread that reports the investigation's status. */
  status_message_ts: z.string().min(1).max(MAX_TIMESTAMP_LENGTH).optional(),
  /** Link to the thread in Slack, when the writer could derive one. HTTPS only: it is rendered as a link. */
  permalink: z
    .url({ protocol: /^https$/ })
    .max(MAX_URL_LENGTH)
    .optional(),
  /**
   * Slack events the writer already handled for this thread, each with the run that handled it,
   * newest last, so an event that is delivered again can be recognised. A writer sends the whole
   * list; it replaces the stored one.
   */
  seen_events: z.array(slackSeenEventSchema).max(MAX_SLACK_SEEN_EVENTS).optional(),
});
export type SlackThreadSubject = z.infer<typeof slackThreadSubjectSchema>;

/** Identifies a subject across investigations: the lookup and claim key. */
export const investigationSubjectKeySchema = z.object({
  type: investigationSubjectTypeSchema,
  id: z.string().min(1).max(MAX_SUBJECT_ID_LENGTH),
});
export type InvestigationSubjectKey = z.infer<typeof investigationSubjectKeySchema>;

/**
 * A subject a writer records on an investigation. `snapshot` belongs to alerts and `slack` to
 * Slack threads. A later write for the same subject replaces the fields it sends and keeps the
 * rest; `slack` is merged field by field, so a writer can add `status_message_ts` alone.
 */
export const investigationSubjectInputSchema = investigationSubjectKeySchema
  .extend({
    /** What the subject is about: an event title, the question asked. Plain text. */
    summary: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
    triggerType: investigationSubjectTriggerTypeSchema.optional(),
    snapshot: alertSubjectSnapshotSchema.optional(),
    slack: slackThreadSubjectSchema.optional(),
  })
  .refine(({ type, snapshot }) => snapshot === undefined || type === 'alert', {
    message: 'snapshot is only allowed on alert subjects',
  })
  .refine(({ type, slack }) => slack === undefined || type === 'slack_thread', {
    message: 'slack is only allowed on slack_thread subjects',
  });
export type InvestigationSubjectInput = z.infer<typeof investigationSubjectInputSchema>;

export const investigationSubjectInputsSchema = z
  .array(investigationSubjectInputSchema)
  .min(1)
  .max(MAX_SUBJECTS_PER_REQUEST);

/**
 * Stored subject document. `subjectType` and `subjectId` name the subject; `id` is the document
 * (and attachment) id, a hash of space, conversation, subject type, and subject id.
 */
export const investigationSubjectSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  conversationId: z.string().max(MAX_ID_LENGTH),
  subjectType: investigationSubjectTypeSchema,
  subjectId: z.string().min(1).max(MAX_SUBJECT_ID_LENGTH),
  summary: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  triggerType: investigationSubjectTriggerTypeSchema.optional(),
  snapshot: alertSubjectSnapshotSchema.optional(),
  slack: slackThreadSubjectSchema.optional(),
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: userSchema.optional(),
  updatedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
});
export type InvestigationSubject = z.infer<typeof investigationSubjectSchema>;
