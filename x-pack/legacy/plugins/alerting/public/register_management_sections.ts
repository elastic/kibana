/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';
import { i18n } from '@kbn/i18n';

management.getSection('elasticsearch').register('alerting', {
  display: i18n.translate(
    'xpack.alerting.sections.alertsList.managementSection.alertingDisplayName',
    {
      defaultMessage: 'Alerting',
    }
  ),
  order: 7,
  url: '#/management/elasticsearch/alerting/',
});

management.getSection('elasticsearch/alerting').register('alerts', {
  display: i18n.translate(
    'xpack.alerting.sections.alertsList.managementSection.alertsDisplayName',
    {
      defaultMessage: 'Alerts',
    }
  ),
  order: 1,
});
