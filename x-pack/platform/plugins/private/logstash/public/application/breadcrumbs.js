/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function getPipelineListBreadcrumbs() {
  return [
    {
      text: i18n.translate('xpack.logstash.pipelines.listBreadcrumb', {
        defaultMessage: 'Pipelines',
      }),
      href: '#/management/ingest/pipelines',
    },
  ];
}

export function getPipelineEditBreadcrumbs(pipelineId) {
  return [
    ...getPipelineListBreadcrumbs(),
    {
      text: pipelineId,
    },
  ];
}

export function getPipelineCreateBreadcrumbs() {
  return [
    ...getPipelineListBreadcrumbs(),
    {
      text: i18n.translate('xpack.logstash.pipelines.createBreadcrumb', {
        defaultMessage: 'Create',
      }),
    },
  ];
}
