/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

export function getPipelineListBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.logstash.pipelines.listBreadcrumb', {
        defaultMessage: 'Pipelines',
      }),
      href: '#/management/logstash/pipelines',
    },
  ];
}

export function getPipelineEditBreadcrumbs($route) {
  const { pipeline } = $route.current.locals;
  return [
    ...getPipelineListBreadcrumbs(),
    {
      text: pipeline.id,
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
