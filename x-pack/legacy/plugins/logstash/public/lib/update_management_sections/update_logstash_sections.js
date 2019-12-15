/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

export function updateLogstashSections(pipelineId) {
  const management = npStart.plugins.management.legacy;
  const editSection = management.getSection('logstash/pipelines/pipeline/edit');
  const newSection = management.getSection('logstash/pipelines/pipeline/new');

  newSection.hide();
  editSection.hide();

  if (pipelineId) {
    editSection.url = `#/management/logstash/pipelines/pipeline/${pipelineId}/edit`;
    editSection.show();
  } else {
    newSection.show();
  }
}
