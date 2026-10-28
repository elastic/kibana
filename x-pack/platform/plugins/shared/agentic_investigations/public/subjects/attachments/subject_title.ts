/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertSubjectSnapshot,
  InvestigationSubjectType,
  SlackThreadSubject,
} from '../../../common/subjects/subject';
import { SUBJECT_TYPE_LABELS, slackChannelLabel } from './translations';

/** The subject fields a row reads, shared by the stored document and the query API. */
export interface SubjectRowData {
  type: InvestigationSubjectType;
  id: string;
  summary?: string;
  snapshot?: AlertSubjectSnapshot;
  slack?: SlackThreadSubject;
}

/**
 * What a subject is called in one line: the alert's rule, a Slack thread's question (else its
 * channel), or what the event or question says.
 */
export const getSubjectTitle = ({ type, id, summary, snapshot, slack }: SubjectRowData): string => {
  if (type === 'alert') {
    return snapshot?.rule_name ?? summary ?? id;
  }
  if (type === 'slack_thread' && summary === undefined && slack) {
    return slackChannelLabel(slack.channel);
  }
  return summary ?? SUBJECT_TYPE_LABELS[type];
};
