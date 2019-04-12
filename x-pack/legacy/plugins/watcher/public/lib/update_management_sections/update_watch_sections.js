/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';

export function updateWatchSections(watchId) {
  const statusSection = management.getSection('elasticsearch/watcher/watch/status');
  const editSection = management.getSection('elasticsearch/watcher/watch/edit');
  const newSection = management.getSection('elasticsearch/watcher/watch/new');
  const historySection = management.getSection('elasticsearch/watcher/watch/history-item');

  newSection.hide();
  statusSection.hide();
  editSection.hide();
  historySection.hide();

  if (watchId) {
    statusSection.url = `#/management/elasticsearch/watcher/watches/watch/${watchId}/status`;
    editSection.url = `#/management/elasticsearch/watcher/watches/watch/${watchId}/edit`;

    statusSection.show();
    editSection.show();
  } else {
    newSection.show();
  }
}
