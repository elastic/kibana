/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MANAGEMENT_BREADCRUMB } from 'ui/management/breadcrumbs';
import { Space } from '../../../common/model/space';

export function getListBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: 'Spaces',
      href: '#/management/spaces/list',
    },
  ];
}

export function getCreateBreadcrumbs() {
  return [
    ...getListBreadcrumbs(),
    {
      text: 'Create',
    },
  ];
}

export function getEditBreadcrumbs(space?: Space) {
  return [
    ...getListBreadcrumbs(),
    {
      text: space ? space.name : '...',
    },
  ];
}
