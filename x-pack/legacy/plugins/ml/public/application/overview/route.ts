/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';
import { checkFullLicense } from '../license/check_license';
import { checkGetJobsPrivilege } from '../privilege/check_privilege';
import { loadMlServerInfo } from '../services/ml_server_info';
import { getOverviewBreadcrumbs } from './breadcrumbs';
import './directive';

const template = `<ml-overview />`;

uiRoutes.when('/overview/?', {
  template,
  k7Breadcrumbs: getOverviewBreadcrumbs,
  resolve: {
    CheckLicense: checkFullLicense,
    privileges: checkGetJobsPrivilege,
    mlNodeCount: getMlNodeCount,
    loadMlServerInfo,
  },
});
