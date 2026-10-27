/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  INVESTIGATION_SUBJECT_TRIGGER_TYPES,
  INVESTIGATION_SUBJECT_TYPES,
  MAX_SLACK_SEEN_EVENTS,
  MAX_SUBJECT_ID_LENGTH,
  MAX_SUBJECTS_PER_CONVERSATION,
  MAX_SUBJECTS_PER_REQUEST,
  SUBJECT_ATTACHMENT_TYPE,
  SUBJECT_CLAIM_INDEX_NAME,
  SUBJECT_INDEX_NAME,
} from './constants';

export {
  MAX_SUBJECT_SNAPSHOT_LENGTH,
  alertSubjectSnapshotSchema,
  investigationSubjectInputSchema,
  investigationSubjectInputsSchema,
  investigationSubjectKeySchema,
  investigationSubjectSchema,
  investigationSubjectTriggerTypeSchema,
  investigationSubjectTypeSchema,
  slackSeenEventSchema,
  slackThreadSubjectSchema,
} from './subject';

export type {
  AlertSubjectSnapshot,
  InvestigationSubject,
  InvestigationSubjectInput,
  InvestigationSubjectKey,
  InvestigationSubjectTriggerType,
  InvestigationSubjectType,
  SlackSeenEvent,
  SlackThreadSubject,
} from './subject';
