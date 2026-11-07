/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TOTAL_ALERTS_METRIC = i18n.translate('xpack.cases.caseView.metrics.totalAlerts', {
  defaultMessage: 'Total alerts',
});

export const ASSOCIATED_USERS_METRIC = i18n.translate(
  'xpack.cases.caseView.metrics.associatedUsers',
  {
    defaultMessage: 'Associated users',
  }
);

export const ASSOCIATED_HOSTS_METRIC = i18n.translate(
  'xpack.cases.caseView.metrics.associatedHosts',
  {
    defaultMessage: 'Associated hosts',
  }
);

export const TOTAL_CONNECTORS_METRIC = i18n.translate(
  'xpack.cases.caseView.metrics.totalConnectors',
  {
    defaultMessage: 'Total connectors',
  }
);

export const CASE_CREATED = i18n.translate('xpack.cases.caseView.metrics.lifespan.caseCreated', {
  defaultMessage: 'Case created',
});

export const CASE_IN_PROGRESS_DURATION = i18n.translate(
  'xpack.cases.caseView.metrics.lifespan.inProgressDuration',
  {
    defaultMessage: 'In progress duration',
  }
);

export const CASE_PAUSED_DURATION = i18n.translate(
  'xpack.cases.caseView.metrics.lifespan.pausedDuration',
  {
    defaultMessage: 'Paused duration',
  }
);

export const CASE_OPEN_DURATION = i18n.translate(
  'xpack.cases.caseView.metrics.lifespan.openDuration',
  {
    defaultMessage: 'Open duration',
  }
);

export const CASE_OPEN_TO_CLOSE_DURATION = i18n.translate(
  'xpack.cases.caseView.metrics.lifespan.openToCloseDuration',
  {
    defaultMessage: 'Duration from creation to close',
  }
);

export const CASE_REOPENED = i18n.translate('xpack.cases.caseView.metrics.lifespan.reopened', {
  defaultMessage: '(reopened)',
});

export const CASE_REOPENED_ON = i18n.translate('xpack.cases.caseView.metrics.lifespan.reopenedOn', {
  defaultMessage: 'Reopened ',
});

export const SCOPE_TITLE = i18n.translate('xpack.cases.caseView.scope.title', {
  defaultMessage: 'Scope',
});

export const SCOPE_IMPACTED = i18n.translate('xpack.cases.caseView.scope.impacted', {
  defaultMessage: 'Impacted',
});

export const SCOPE_INDICATORS = i18n.translate('xpack.cases.caseView.scope.indicators', {
  defaultMessage: 'Indicators',
});

export const SCOPE_ACTIVITY = i18n.translate('xpack.cases.caseView.scope.activity', {
  defaultMessage: 'Case activity',
});

export const SCOPE_HOSTS = (count: number) =>
  i18n.translate('xpack.cases.caseView.scope.hosts', {
    values: { count },
    defaultMessage: '{count, plural, one {# host} other {# hosts}}',
  });

export const SCOPE_USERS = (count: number) =>
  i18n.translate('xpack.cases.caseView.scope.users', {
    values: { count },
    defaultMessage: '{count, plural, one {# user} other {# users}}',
  });

export const SCOPE_MORE = (count: number) =>
  i18n.translate('xpack.cases.caseView.scope.more', {
    values: { count },
    defaultMessage: '+{count} more',
  });

export const SCOPE_MORE_TYPES = (count: number) =>
  i18n.translate('xpack.cases.caseView.scope.moreTypes', {
    values: { count },
    defaultMessage: '+{count, plural, one {# more type} other {# more types}}',
  });

export const SCOPE_OBSERVABLES = (count: number) =>
  i18n.translate('xpack.cases.caseView.scope.observables', {
    values: { count },
    defaultMessage: '{count, plural, one {# observable} other {# observables}}',
  });

export const SCOPE_ALERTS = (count: number) =>
  i18n.translate('xpack.cases.caseView.scope.alerts', {
    values: { count },
    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
  });

export const SCOPE_CONNECTORS = (count: number) =>
  i18n.translate('xpack.cases.caseView.scope.connectors', {
    values: { count },
    defaultMessage: '{count, plural, one {# connector} other {# connectors}}',
  });

export const SCOPE_OPENED = (time: string) =>
  i18n.translate('xpack.cases.caseView.scope.opened', {
    values: { time },
    defaultMessage: 'Opened {time}',
  });

export const SCOPE_OPEN_FOR = (duration: string) =>
  i18n.translate('xpack.cases.caseView.scope.openFor', {
    values: { duration },
    defaultMessage: 'open {duration}',
  });

export const SCOPE_IN_PROGRESS_FOR = (duration: string) =>
  i18n.translate('xpack.cases.caseView.scope.inProgressFor', {
    values: { duration },
    defaultMessage: 'in progress {duration}',
  });

export const SCOPE_PAUSED_FOR = (duration: string) =>
  i18n.translate('xpack.cases.caseView.scope.pausedFor', {
    values: { duration },
    defaultMessage: 'paused {duration}',
  });

export const SCOPE_CLOSED_AFTER = (duration: string) =>
  i18n.translate('xpack.cases.caseView.scope.closedAfter', {
    values: { duration },
    defaultMessage: 'closed after {duration}',
  });

export const SCOPE_SHOW_TYPE = (type: string) =>
  i18n.translate('xpack.cases.caseView.scope.showType', {
    values: { type },
    defaultMessage: 'Show the {type} observables',
  });

export const SCOPE_NO_IMPACTED = i18n.translate('xpack.cases.caseView.scope.noImpacted', {
  defaultMessage: 'No impacted hosts or users yet.',
});

export const SCOPE_NO_OBSERVABLES = i18n.translate('xpack.cases.caseView.scope.noObservables', {
  defaultMessage: 'No observables yet.',
});

export const SCOPE_SHOW_IMPACT = i18n.translate('xpack.cases.caseView.scope.showImpact', {
  defaultMessage: 'Show every impacted host and user',
});

export const SCOPE_PAUSED_NOW = i18n.translate('xpack.cases.caseView.scope.pausedNow', {
  defaultMessage: 'paused now',
});

export const SCOPE_METRICS = i18n.translate('xpack.cases.caseView.scope.metrics', {
  defaultMessage: 'Case metrics',
});

export const SCOPE_METRIC_ALERTS = i18n.translate('xpack.cases.caseView.scope.metric.alerts', {
  defaultMessage: 'Alerts',
});

export const SCOPE_METRIC_ALERT_HOSTS = i18n.translate(
  'xpack.cases.caseView.scope.metric.alertHosts',
  { defaultMessage: 'Hosts in alerts' }
);

export const SCOPE_METRIC_ALERT_USERS = i18n.translate(
  'xpack.cases.caseView.scope.metric.alertUsers',
  { defaultMessage: 'Users in alerts' }
);

export const SCOPE_METRIC_CONNECTORS = i18n.translate(
  'xpack.cases.caseView.scope.metric.connectors',
  { defaultMessage: 'Connectors' }
);

export const SCOPE_METRIC_CREATED = i18n.translate('xpack.cases.caseView.scope.metric.created', {
  defaultMessage: 'Created',
});

export const SCOPE_METRIC_OPEN = i18n.translate('xpack.cases.caseView.scope.metric.open', {
  defaultMessage: 'Open',
});

export const SCOPE_METRIC_IN_PROGRESS = i18n.translate(
  'xpack.cases.caseView.scope.metric.inProgress',
  { defaultMessage: 'In progress' }
);

export const SCOPE_METRIC_PAUSED = i18n.translate('xpack.cases.caseView.scope.metric.paused', {
  defaultMessage: 'Paused',
});

export const SCOPE_METRIC_TO_CLOSE = i18n.translate('xpack.cases.caseView.scope.metric.toClose', {
  defaultMessage: 'Created to close',
});

export const SCOPE_METRIC_REOPENED = i18n.translate('xpack.cases.caseView.scope.metric.reopened', {
  defaultMessage: 'Reopened',
});

export const SCOPE_METRIC_TIMES = (count: number) =>
  i18n.translate('xpack.cases.caseView.scope.metric.times', {
    values: { count },
    defaultMessage: '{count, plural, one {# time} other {# times}}',
  });
