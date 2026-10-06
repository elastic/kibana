/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InvestigationSubjectType } from '../../../common/subjects/subject';

export const SUBJECT_TYPE_LABELS: Record<InvestigationSubjectType, string> = {
  alert: i18n.translate('xpack.agenticInvestigations.subjects.type.alert', {
    defaultMessage: 'Alert',
  }),
  significant_event: i18n.translate('xpack.agenticInvestigations.subjects.type.significantEvent', {
    defaultMessage: 'Significant event',
  }),
  manual: i18n.translate('xpack.agenticInvestigations.subjects.type.manual', {
    defaultMessage: 'Question',
  }),
  slack_thread: i18n.translate('xpack.agenticInvestigations.subjects.type.slackThread', {
    defaultMessage: 'Slack',
  }),
};

export const SUBJECT_LABEL = i18n.translate(
  'xpack.agenticInvestigations.subjects.attachments.label',
  {
    defaultMessage: 'Subject',
  }
);

export const slackChannelLabel = (channel: string): string =>
  i18n.translate('xpack.agenticInvestigations.subjects.slackChannel', {
    defaultMessage: '#{channel}',
    values: { channel },
  });

export const subjectAttachmentLabel = (type: InvestigationSubjectType, detail?: string): string =>
  detail
    ? i18n.translate('xpack.agenticInvestigations.subjects.attachments.labelWithDetail', {
        defaultMessage: '{type}: {detail}',
        values: { type: SUBJECT_TYPE_LABELS[type], detail },
      })
    : SUBJECT_TYPE_LABELS[type];

/** The line under a subject row's title: the subject started (or continued) the investigation. */
export const subjectTriggerLabel = (type: InvestigationSubjectType): string =>
  i18n.translate('xpack.agenticInvestigations.subjects.triggerLabel', {
    defaultMessage: 'Trigger · {type}',
    values: { type: SUBJECT_TYPE_LABELS[type] },
  });

/** The line under an alert listed under an "N alerts" row: when that alert started. */
export const nestedAlertTriggerLabel = (start: string): string =>
  i18n.translate('xpack.agenticInvestigations.subjects.nestedAlertTriggerLabel', {
    defaultMessage: 'Trigger · Alert · {start}',
    values: { start },
  });

export const OPENS_IN_NEW_TAB = i18n.translate(
  'xpack.agenticInvestigations.subjects.opensInNewTab',
  { defaultMessage: 'Opens in a new tab' }
);

/** The summary row of several alerts. */
export const alertsCountLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.subjects.alertsCount', {
    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
    values: { count },
  });

export const TRIGGER_LABEL = i18n.translate('xpack.agenticInvestigations.subjects.trigger', {
  defaultMessage: 'Trigger',
});
