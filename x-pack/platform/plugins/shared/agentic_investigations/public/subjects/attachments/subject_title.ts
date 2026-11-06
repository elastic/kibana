/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import type {
  AlertSubjectSnapshot,
  InvestigationSubjectTriggerType,
  InvestigationSubjectType,
  SlackThreadSubject,
} from '../../../common/subjects/subject';
import { SUBJECT_TYPE_LABELS, slackChannelLabel } from './translations';

/** The subject fields a row reads, shared by the stored document and the query API. */
export interface SubjectRowData {
  type: InvestigationSubjectType;
  id: string;
  summary?: string;
  trigger_type?: InvestigationSubjectTriggerType;
  snapshot?: AlertSubjectSnapshot;
  slack?: SlackThreadSubject;
}

/**
 * The type a subject is presented as (its icon and label). A significant event is an alert whose
 * `snapshot.source` says so, and reads as a significant event rather than as an alert.
 */
export const getSubjectDisplayType = ({
  type,
  snapshot,
}: Pick<SubjectRowData, 'type' | 'snapshot'>): InvestigationSubjectType =>
  type === 'alert' && snapshot?.source === SIGNIFICANT_EVENTS_ALERT_SOURCE
    ? 'significant_event'
    : type;

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
