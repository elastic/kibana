/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_SUBJECTS_PER_CONVERSATION,
  SUBJECT_ATTACHMENT_TYPE,
} from '../../../common/subjects/constants';
import {
  investigationSubjectSchema,
  type InvestigationSubject,
} from '../../../common/subjects/subject';
import { defineInvestigationAttachment } from '../../investigation_attachments';
import {
  subjectStorageSettings,
  type SubjectDocument,
  type SubjectStorageSettings,
} from '../storage/subject_storage';

const SUBJECT_TYPE_LABELS: Record<InvestigationSubject['subjectType'], string> = {
  alert: 'Alert',
  significant_event: 'Significant event',
  manual: 'Question',
  slack_thread: 'Slack thread',
};

const formatAlert = ({ snapshot }: InvestigationSubject): string[] => {
  if (!snapshot) {
    return [];
  }
  return [
    snapshot.rule_name ? `Rule: ${snapshot.rule_name}` : undefined,
    snapshot.status ? `Status: ${snapshot.status}` : undefined,
    snapshot.reason ? `Reason: ${snapshot.reason}` : undefined,
    snapshot.start ? `Started: ${snapshot.start}` : undefined,
  ].filter((line): line is string => line !== undefined);
};

const formatSlack = ({ slack }: InvestigationSubject): string[] =>
  slack ? [`Channel: #${slack.channel}`, `Thread: ${slack.thread_ts}`] : [];

/** Text the LLM sees: what the investigation is about, without the raw alert snapshot. */
export const formatSubjectForAgent = (subject: InvestigationSubject): string =>
  [
    `## Investigation subject: ${SUBJECT_TYPE_LABELS[subject.subjectType]}`,
    `Subject id: ${subject.subjectId}`,
    subject.triggerType ? `Triggered: ${subject.triggerType}` : undefined,
    subject.summary ? `Summary: ${subject.summary}` : undefined,
    ...formatAlert(subject),
    ...formatSlack(subject),
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');

/**
 * `investigation_subject`: what an investigation is about, one document per space, conversation,
 * and subject in `.kibana-investigation-subject`. Written by the routes and steps that start an
 * investigation, never by the agent. Origin and attachment id are the document id.
 */
export const subjectAttachment = defineInvestigationAttachment<
  typeof SUBJECT_ATTACHMENT_TYPE,
  SubjectStorageSettings,
  SubjectDocument
>({
  type: SUBJECT_ATTACHMENT_TYPE,
  storageSettings: subjectStorageSettings,
  schema: investigationSubjectSchema,
  maxDocumentsPerConversation: MAX_SUBJECTS_PER_CONVERSATION,
  // The investigation overview shows subjects; the chat does not.
  hiddenInConversation: true,
  format: formatSubjectForAgent,
  describe: (subject) => `${SUBJECT_TYPE_LABELS[subject.subjectType]}: ${subject.subjectId}`,
  agentDescription:
    'An investigation subject is what the investigation is about: an alert, a significant event, a question asked by a user, or a Slack thread. ' +
    'An investigation can have several subjects; follow-ups add more.\n\n' +
    'Rules:\n' +
    '- Subjects are recorded by the system that started the investigation. Do not try to change them.\n' +
    '- Treat subject ids as opaque.',
});
