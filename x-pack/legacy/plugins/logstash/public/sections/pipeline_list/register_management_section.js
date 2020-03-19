/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';
import { i18n } from '@kbn/i18n';

management.getSection('ingest').register('pipelines', {
  display: i18n.translate('xpack.logstash.managementSection.pipelinesTitle', {
    defaultMessage: 'Logstash Pipelines',
  }),
  order: 40,
  url: '#/management/logstash/pipelines/',
});

// management.getSection('ingest/pipelines').register('pipeline', {
//   visible: false,
// });

// management.getSection('ingest/pipelines/pipeline').register('edit', {
//   display: i18n.translate('xpack.logstash.managementSection.editPipelineTitle', {
//     defaultMessage: 'Edit pipeline',
//   }),
//   order: 1,
//   visible: false,
// });

// management.getSection('ingest/pipelines/pipeline').register('new', {
//   display: i18n.translate('xpack.logstash.managementSection.createPipelineTitle', {
//     defaultMessage: 'Create pipeline',
//   }),
//   order: 1,
//   visible: false,
// });
