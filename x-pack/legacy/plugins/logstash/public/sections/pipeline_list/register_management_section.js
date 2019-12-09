/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';
import { i18n } from '@kbn/i18n';

management.getSection('logstash').register('pipelines', {
  display: i18n.translate('xpack.logstash.managementSection.pipelinesTitle', {
    defaultMessage: 'Pipelines',
  }),
  order: 10,
  url: '#/management/logstash/pipelines/'
});
