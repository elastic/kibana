/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSubjectResponse, InvestigationSummary } from '../../../../common';
import { SUBJECT_TYPE_LABELS, slackChannelLabel } from '../../../subjects/attachments/translations';
import { NEW_INVESTIGATION_TITLE } from './translations';

/** What a subject is called in one line: the alert's rule, the Slack channel, or its summary. */
export const getSubjectLabel = (subject: InvestigationSubjectResponse): string => {
  if (subject.type === 'alert') {
    return subject.snapshot?.rule_name ?? subject.summary ?? subject.id;
  }
  if (subject.type === 'slack_thread' && subject.slack) {
    return slackChannelLabel(subject.slack.channel);
  }
  return subject.summary ?? SUBJECT_TYPE_LABELS[subject.type];
};

/**
 * What an untitled investigation is named after its first subject. A Slack thread is named after
 * its question rather than its channel, whose id reads poorly as a headline.
 */
const getSubjectTitle = (subject: InvestigationSubjectResponse): string =>
  (subject.type === 'slack_thread' ? subject.summary : undefined) ?? getSubjectLabel(subject);

/**
 * The investigation's title, or while Agent Builder has not generated it yet (it does on the
 * first round), what the first subject is called, or else a generic "New investigation".
 */
export const getInvestigationDisplayTitle = ({
  title,
  title_pending: titlePending,
  subjects,
}: Pick<InvestigationSummary, 'title' | 'title_pending' | 'subjects'>): string => {
  if (!titlePending) {
    return title;
  }
  const [first] = subjects;
  return first ? getSubjectTitle(first) : NEW_INVESTIGATION_TITLE;
};
