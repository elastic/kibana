/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBaseBreadcrumb, setBreadcrumb } from '../../lib/breadcrumbs';
import { HomeApp } from './home_app';

export const routes = [
  {
    name: 'home',
    path: '/',
    action: () => () => {
      setBreadcrumb([getBaseBreadcrumb()]);
    },
    meta: {
      component: HomeApp,
    },
  },
];
