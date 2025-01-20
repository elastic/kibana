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

export const ISOLATED_HOSTS_METRIC = i18n.translate('xpack.cases.caseView.metrics.isolatedHosts', {
  defaultMessage: 'Isolated hosts',
});

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
