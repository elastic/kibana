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

management.getSection('elasticsearch/watcher').register('watches', {
  display: i18n.translate('xpack.watcher.sections.watchList.managementSection.watchesDisplayName', {
    defaultMessage: 'Watches',
  }),
  order: 1,
});

management.getSection('elasticsearch/watcher').register('watch', {
  visible: false,
});

management.getSection('elasticsearch/watcher/watch').register('status', {
  display: i18n.translate('xpack.watcher.sections.watchList.managementSection.statusDisplayName', {
    defaultMessage: 'Status',
  }),
  order: 1,
  visible: false,
});

management.getSection('elasticsearch/watcher/watch').register('edit', {
  display: i18n.translate('xpack.watcher.sections.watchList.managementSection.editDisplayName', {
    defaultMessage: 'Edit',
  }),
  order: 2,
  visible: false,
});

management.getSection('elasticsearch/watcher/watch').register('new', {
  display: i18n.translate(
    'xpack.watcher.sections.watchList.managementSection.newWatchDisplayName',
    {
      defaultMessage: 'New Watch',
    }
  ),
  order: 1,
  visible: false,
});

management.getSection('elasticsearch/watcher/watch').register('history-item', {
  order: 1,
  visible: false,
});
