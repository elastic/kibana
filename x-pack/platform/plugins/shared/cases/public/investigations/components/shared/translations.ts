/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const JUST_NOW = i18n.translate('xpack.cases.investigations.shared.justNow', {
  defaultMessage: 'Just now',
});

export const SECONDS_AGO = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.secondsAgo', {
    defaultMessage: '{value} s ago',
    values: { value },
  });

export const MINUTES_AGO = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.minutesAgo', {
    defaultMessage: '{value} min ago',
    values: { value },
  });

export const HOURS_AGO = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.hoursAgo', {
    defaultMessage: '{value} h ago',
    values: { value },
  });

export const DAYS_AGO = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.daysAgo', {
    defaultMessage: '{value, plural, one {# day} other {# days}} ago',
    values: { value },
  });

export const WEEKS_AGO = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.weeksAgo', {
    defaultMessage: '{value} wk ago',
    values: { value },
  });

export const MONTHS_AGO = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.monthsAgo', {
    defaultMessage: '{value} mo ago',
    values: { value },
  });

export const YEARS_AGO = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.yearsAgo', {
    defaultMessage: '{value} y ago',
    values: { value },
  });

export const SECONDS_SHORT = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.secondsShort', {
    defaultMessage: '{value} s',
    values: { value },
  });

export const MINUTES_SHORT = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.minutesShort', {
    defaultMessage: '{value} min',
    values: { value },
  });

export const HOURS_SHORT = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.hoursShort', {
    defaultMessage: '{value} h',
    values: { value },
  });

export const DAYS_SHORT = (value: number) =>
  i18n.translate('xpack.cases.investigations.shared.daysShort', {
    defaultMessage: '{value, plural, one {# day} other {# days}}',
    values: { value },
  });

export const OPEN_FOR = (duration: string) =>
  i18n.translate('xpack.cases.investigations.shared.openFor', {
    defaultMessage: 'Open for {duration}',
    values: { duration },
  });

export const ACTOR_AGENT = i18n.translate('xpack.cases.investigations.shared.actorAgent', {
  defaultMessage: 'Agent',
});

export const ACTOR_AUTOMATION = i18n.translate(
  'xpack.cases.investigations.shared.actorAutomation',
  { defaultMessage: 'Automation' }
);

export const ON_BEHALF_OF = (name: string) =>
  i18n.translate('xpack.cases.investigations.shared.onBehalfOf', {
    defaultMessage: 'on behalf of {name}',
    values: { name },
  });

export const ACTOR_UNKNOWN = i18n.translate('xpack.cases.investigations.shared.actorUnknown', {
  defaultMessage: 'Unknown',
});

export const STATUS_NEEDS_OWNER = i18n.translate(
  'xpack.cases.investigations.shared.statusNeedsOwner',
  { defaultMessage: 'Needs owner' }
);

export const STATUS_IN_PROGRESS = i18n.translate(
  'xpack.cases.investigations.shared.statusInProgress',
  { defaultMessage: 'In progress' }
);

export const STATUS_CLOSED = i18n.translate('xpack.cases.investigations.shared.statusClosed', {
  defaultMessage: 'Closed',
});

export const PRIORITY_LABELS = {
  low: i18n.translate('xpack.cases.investigations.shared.priorityLow', { defaultMessage: 'Low' }),
  medium: i18n.translate('xpack.cases.investigations.shared.priorityMedium', {
    defaultMessage: 'Medium',
  }),
  high: i18n.translate('xpack.cases.investigations.shared.priorityHigh', {
    defaultMessage: 'High',
  }),
  critical: i18n.translate('xpack.cases.investigations.shared.priorityCritical', {
    defaultMessage: 'Critical',
  }),
} as const;

export const VERDICT_NOT_SET = i18n.translate('xpack.cases.investigations.shared.verdictNotSet', {
  defaultMessage: 'Not set',
});

export const VERDICT_SOURCE_ANALYST = i18n.translate(
  'xpack.cases.investigations.shared.verdictSourceAnalyst',
  { defaultMessage: 'analyst' }
);

export const VERDICT_SOURCE_AGENT = i18n.translate(
  'xpack.cases.investigations.shared.verdictSourceAgent',
  { defaultMessage: 'agent' }
);

export const LOADING = i18n.translate('xpack.cases.investigations.shared.loading', {
  defaultMessage: 'Loading',
});

export const ERROR_TITLE = i18n.translate('xpack.cases.investigations.shared.errorTitle', {
  defaultMessage: 'Something went wrong',
});

export const RETRY = i18n.translate('xpack.cases.investigations.shared.retry', {
  defaultMessage: 'Try again',
});

export const CONFIRM_DEFAULT = i18n.translate('xpack.cases.investigations.shared.confirm', {
  defaultMessage: 'Confirm',
});

export const CANCEL = i18n.translate('xpack.cases.investigations.shared.cancel', {
  defaultMessage: 'Cancel',
});

export const PAUSED_BADGE = (reason: string, duration: string) =>
  i18n.translate('xpack.cases.investigations.shared.pausedBadge', {
    defaultMessage: 'Paused: {reason} · {duration}',
    values: { reason, duration },
  });

export const PAUSED_BADGE_NO_REASON = (duration: string) =>
  i18n.translate('xpack.cases.investigations.shared.pausedBadgeNoReason', {
    defaultMessage: 'Paused · {duration}',
    values: { duration },
  });

export const CLOSED_WITHOUT_VERDICT = i18n.translate(
  'xpack.cases.investigations.shared.closedWithoutVerdict',
  { defaultMessage: 'Closed' }
);

export const CLOSED_REASON_LINE = (reason: string) =>
  i18n.translate('xpack.cases.investigations.shared.closedReasonLine', {
    defaultMessage: 'Reason: {reason}.',
    values: { reason },
  });
