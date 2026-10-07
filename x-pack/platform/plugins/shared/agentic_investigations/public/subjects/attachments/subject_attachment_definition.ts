/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUBJECT_ATTACHMENT_TYPE } from '../../../common/subjects/constants';
import type { InvestigationSubject } from '../../../common/subjects/subject';
import type { InvestigationAttachmentRenderer } from '../../investigation_attachments';
import { SUBJECT_LABEL, slackChannelLabel, subjectAttachmentLabel } from './translations';

const labelDetail = ({
  subjectType,
  snapshot,
  slack,
}: InvestigationSubject): string | undefined => {
  if (subjectType === 'alert') {
    return snapshot?.rule_name;
  }
  if (subjectType === 'slack_thread' && slack) {
    return slackChannelLabel(slack.channel);
  }
  return undefined;
};

/** Browser UI for the investigation_subject attachment; the content loads on first render. */
export const subjectAttachmentRenderer: InvestigationAttachmentRenderer<InvestigationSubject> & {
  type: typeof SUBJECT_ATTACHMENT_TYPE;
} = {
  type: SUBJECT_ATTACHMENT_TYPE,
  // The data can be missing while a by-reference attachment is still resolving.
  getLabel: (subject) =>
    subject?.subjectType
      ? subjectAttachmentLabel(subject.subjectType, labelDetail(subject))
      : SUBJECT_LABEL,
  icon: 'bullseye',
  loadContent: () => import('./subject_view').then(({ SubjectView }) => SubjectView),
};
