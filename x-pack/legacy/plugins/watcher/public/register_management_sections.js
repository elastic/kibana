/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { management } from 'ui/management';
import { i18n } from '@kbn/i18n';

management.getSection('elasticsearch').register('watcher', {
  display: i18n.translate('xpack.watcher.sections.watchList.managementSection.watcherDisplayName', {
    defaultMessage: 'Watcher',
  }),
  order: 6,
  url: '#/management/elasticsearch/watcher/',
});
