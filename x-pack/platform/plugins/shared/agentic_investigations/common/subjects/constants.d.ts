/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Attachment type identifier registered with Agent Builder. */
export declare const SUBJECT_ATTACHMENT_TYPE: 'investigation_subject';
/** One document per space, conversation, and subject. See README "Index naming". */
export declare const SUBJECT_INDEX_NAME: '.kibana-investigation-subject';
/**
 * One claim per space and subject, so concurrent starts for the same subject agree on one
 * investigation. A sibling index rather than a second document kind in the subject index, so
 * every subject index document is an attachment document.
 *
 * Not `.kibana-investigation-subject-claim`: the storage adapter's index template matches
 * `<name>-*`, so the subject template would match the claim index and Elasticsearch refuses
 * two same-priority templates with overlapping patterns.
 */
export declare const SUBJECT_CLAIM_INDEX_NAME: '.kibana-investigation-claim';
/** What an investigation is about. `slack_thread` is a Slack thread asking a question. */
export declare const INVESTIGATION_SUBJECT_TYPES: readonly [
  'alert',
  'significant_event',
  'manual',
  'slack_thread'
];
/** How the investigation was started for this subject. */
export declare const INVESTIGATION_SUBJECT_TRIGGER_TYPES: readonly ['automatic', 'manual'];
/** Bound on a subject id: an alert uuid, an event id, or `team:<T>/channel:<C>/thread:<ts>`. */
export declare const MAX_SUBJECT_ID_LENGTH = 512;
/** Bound on subjects one write or lookup carries. */
export declare const MAX_SUBJECTS_PER_REQUEST = 50;
/** Bound on subjects one investigation holds, follow-ups included. */
export declare const MAX_SUBJECTS_PER_CONVERSATION = 100;
/** Bound on the delivered Slack event ids a `slack_thread` subject remembers, newest last. */
export declare const MAX_SLACK_SEEN_EVENT_IDS = 50;
