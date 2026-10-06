/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
/** Serialized size bound on a snapshot, whose open fields (rule parameters, grouping) are opaque. */
export declare const MAX_SUBJECT_SNAPSHOT_LENGTH = 64000;
export declare const investigationSubjectTypeSchema: z.ZodEnum<{
  alert: 'alert';
  manual: 'manual';
  significant_event: 'significant_event';
  slack_thread: 'slack_thread';
}>;
export type InvestigationSubjectType = z.infer<typeof investigationSubjectTypeSchema>;
export declare const investigationSubjectTriggerTypeSchema: z.ZodEnum<{
  automatic: 'automatic';
  manual: 'manual';
}>;
export type InvestigationSubjectTriggerType = z.infer<typeof investigationSubjectTriggerTypeSchema>;
/**
 * Point-in-time copy of an alert, taken by the caller when the investigation started. Loose: the
 * fields a renderer reads are declared with the same bounds as Nightshift's `alertSnapshotSchema`,
 * so every Nightshift snapshot validates, and any other field is kept as is. The key count and the
 * serialized size are bounded because the open fields are opaque.
 */
export declare const alertSubjectSnapshotSchema: z.ZodObject<
  {
    id: z.ZodOptional<z.ZodString>;
    rule_id: z.ZodOptional<z.ZodString>;
    rule_name: z.ZodOptional<z.ZodString>;
    rule_type_id: z.ZodOptional<z.ZodString>;
    rule_category: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    start: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    rule_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$loose
>;
export type AlertSubjectSnapshot = z.infer<typeof alertSubjectSnapshotSchema>;
/** Where a `slack_thread` subject lives, and the status message the investigation keeps updated. */
export declare const slackThreadSubjectSchema: z.ZodObject<
  {
    channel: z.ZodString;
    thread_ts: z.ZodString;
    status_message_ts: z.ZodOptional<z.ZodString>;
    permalink: z.ZodOptional<z.ZodURL>;
    seen_event_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$strip
>;
export type SlackThreadSubject = z.infer<typeof slackThreadSubjectSchema>;
/** Identifies a subject across investigations: the lookup and claim key. */
export declare const investigationSubjectKeySchema: z.ZodObject<
  {
    type: z.ZodEnum<{
      alert: 'alert';
      manual: 'manual';
      significant_event: 'significant_event';
      slack_thread: 'slack_thread';
    }>;
    id: z.ZodString;
  },
  z.core.$strip
>;
export type InvestigationSubjectKey = z.infer<typeof investigationSubjectKeySchema>;
/**
 * A subject a writer records on an investigation. `snapshot` belongs to alerts and `slack` to
 * Slack threads. A later write for the same subject replaces the fields it sends and keeps the
 * rest; `slack` is merged field by field, so a writer can add `status_message_ts` alone.
 */
export declare const investigationSubjectInputSchema: z.ZodObject<
  {
    type: z.ZodEnum<{
      alert: 'alert';
      manual: 'manual';
      significant_event: 'significant_event';
      slack_thread: 'slack_thread';
    }>;
    id: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    triggerType: z.ZodOptional<
      z.ZodEnum<{
        automatic: 'automatic';
        manual: 'manual';
      }>
    >;
    snapshot: z.ZodOptional<
      z.ZodObject<
        {
          id: z.ZodOptional<z.ZodString>;
          rule_id: z.ZodOptional<z.ZodString>;
          rule_name: z.ZodOptional<z.ZodString>;
          rule_type_id: z.ZodOptional<z.ZodString>;
          rule_category: z.ZodOptional<z.ZodString>;
          reason: z.ZodOptional<z.ZodString>;
          status: z.ZodOptional<z.ZodString>;
          start: z.ZodOptional<z.ZodString>;
          timestamp: z.ZodOptional<z.ZodString>;
          url: z.ZodOptional<z.ZodString>;
          rule_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        },
        z.core.$loose
      >
    >;
    slack: z.ZodOptional<
      z.ZodObject<
        {
          channel: z.ZodString;
          thread_ts: z.ZodString;
          status_message_ts: z.ZodOptional<z.ZodString>;
          permalink: z.ZodOptional<z.ZodURL>;
          seen_event_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type InvestigationSubjectInput = z.infer<typeof investigationSubjectInputSchema>;
export declare const investigationSubjectInputsSchema: z.ZodArray<
  z.ZodObject<
    {
      type: z.ZodEnum<{
        alert: 'alert';
        manual: 'manual';
        significant_event: 'significant_event';
        slack_thread: 'slack_thread';
      }>;
      id: z.ZodString;
      summary: z.ZodOptional<z.ZodString>;
      triggerType: z.ZodOptional<
        z.ZodEnum<{
          automatic: 'automatic';
          manual: 'manual';
        }>
      >;
      snapshot: z.ZodOptional<
        z.ZodObject<
          {
            id: z.ZodOptional<z.ZodString>;
            rule_id: z.ZodOptional<z.ZodString>;
            rule_name: z.ZodOptional<z.ZodString>;
            rule_type_id: z.ZodOptional<z.ZodString>;
            rule_category: z.ZodOptional<z.ZodString>;
            reason: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodString>;
            start: z.ZodOptional<z.ZodString>;
            timestamp: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            rule_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
          },
          z.core.$loose
        >
      >;
      slack: z.ZodOptional<
        z.ZodObject<
          {
            channel: z.ZodString;
            thread_ts: z.ZodString;
            status_message_ts: z.ZodOptional<z.ZodString>;
            permalink: z.ZodOptional<z.ZodURL>;
            seen_event_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
          },
          z.core.$strip
        >
      >;
    },
    z.core.$strip
  >
>;
/**
 * Stored subject document. `subjectType` and `subjectId` name the subject; `id` is the document
 * (and attachment) id, a hash of space, conversation, subject type, and subject id.
 */
export declare const investigationSubjectSchema: z.ZodObject<
  {
    id: z.ZodString;
    spaceId: z.ZodString;
    conversationId: z.ZodString;
    subjectType: z.ZodEnum<{
      alert: 'alert';
      manual: 'manual';
      significant_event: 'significant_event';
      slack_thread: 'slack_thread';
    }>;
    subjectId: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    triggerType: z.ZodOptional<
      z.ZodEnum<{
        automatic: 'automatic';
        manual: 'manual';
      }>
    >;
    snapshot: z.ZodOptional<
      z.ZodObject<
        {
          id: z.ZodOptional<z.ZodString>;
          rule_id: z.ZodOptional<z.ZodString>;
          rule_name: z.ZodOptional<z.ZodString>;
          rule_type_id: z.ZodOptional<z.ZodString>;
          rule_category: z.ZodOptional<z.ZodString>;
          reason: z.ZodOptional<z.ZodString>;
          status: z.ZodOptional<z.ZodString>;
          start: z.ZodOptional<z.ZodString>;
          timestamp: z.ZodOptional<z.ZodString>;
          url: z.ZodOptional<z.ZodString>;
          rule_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        },
        z.core.$loose
      >
    >;
    slack: z.ZodOptional<
      z.ZodObject<
        {
          channel: z.ZodString;
          thread_ts: z.ZodString;
          status_message_ts: z.ZodOptional<z.ZodString>;
          permalink: z.ZodOptional<z.ZodURL>;
          seen_event_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    createdAt: z.ZodString;
    createdBy: z.ZodOptional<
      z.ZodObject<
        {
          username: z.ZodNullable<z.ZodString>;
          fullName: z.ZodNullable<z.ZodString>;
          email: z.ZodNullable<z.ZodString>;
          profileUid: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    updatedAt: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export type InvestigationSubject = z.infer<typeof investigationSubjectSchema>;
