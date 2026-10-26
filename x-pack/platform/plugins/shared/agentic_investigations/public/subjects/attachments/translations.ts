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

export const ALERT_FLYOUT_TITLE = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.title',
  { defaultMessage: 'Alert details' }
);

export const ALERT_FLYOUT_OVERVIEW_TAB = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.overviewTab',
  { defaultMessage: 'Overview' }
);

export const ALERT_FLYOUT_FIELDS_TAB = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.fieldsTab',
  { defaultMessage: 'Fields' }
);

export const ALERT_FLYOUT_LOADING = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.loading',
  { defaultMessage: 'Loading alert details' }
);

export const ALERT_FLYOUT_ERROR_TITLE = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.errorTitle',
  { defaultMessage: 'Unable to load this alert' }
);

export const ALERT_FLYOUT_ERROR_BODY = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.errorBody',
  { defaultMessage: 'The alert may have been deleted, or you may not have access to it.' }
);

export const ALERT_FLYOUT_CLOSE = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.close',
  { defaultMessage: 'Close' }
);

export const ALERT_FLYOUT_VIEW_DETAILS = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.viewDetails',
  { defaultMessage: 'View alert details' }
);

export const ALERT_FLYOUT_FIELD_STATUS = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.fieldStatus',
  { defaultMessage: 'Status' }
);

export const ALERT_FLYOUT_FIELD_RULE = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.fieldRule',
  { defaultMessage: 'Rule' }
);

export const ALERT_FLYOUT_FIELD_REASON = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.fieldReason',
  { defaultMessage: 'Reason' }
);

export const ALERT_FLYOUT_FIELD_STARTED = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.fieldStarted',
  { defaultMessage: 'Started' }
);

export const ALERT_FLYOUT_FIELD_DURATION = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.fieldDuration',
  { defaultMessage: 'Duration' }
);

export const ALERT_FLYOUT_FIELD_TAGS = i18n.translate(
  'xpack.agenticInvestigations.subjects.alertFlyout.fieldTags',
  { defaultMessage: 'Tags' }
);
