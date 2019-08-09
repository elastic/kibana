/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function getHomeBreadcrumbs() {
  return [
    {
      text: i18n.translate('xpack.graph.home.breadcrumb', {
        defaultMessage: 'Graph'
      }),
      href: '#/home'
    }
  ];
}

export function getWorkspaceBreadcrumbs($route) {
  const { savedWorkspace } = $route.current.locals;

  return [
    ...getHomeBreadcrumbs(),
    {
      text: savedWorkspace.title
    }
  ];
}
