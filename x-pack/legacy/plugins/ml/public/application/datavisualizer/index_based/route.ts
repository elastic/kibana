/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import uiRoutes from 'ui/routes';
import { checkBasicLicense } from '../../license/check_license';
import { checkGetJobsPrivilege } from '../../privilege/check_privilege';
import { loadCurrentIndexPattern, loadCurrentSavedSearch } from '../../util/index_utils';

import { checkMlNodesAvailable } from '../../ml_nodes_check';
import { getDataVisualizerBreadcrumbs } from './breadcrumbs';

const template = `<ml-data-visualizer />`;

uiRoutes.when('/jobs/new_job/datavisualizer', {
  template,
  k7Breadcrumbs: getDataVisualizerBreadcrumbs,
  resolve: {
    CheckLicense: checkBasicLicense,
    privileges: checkGetJobsPrivilege,
    indexPattern: loadCurrentIndexPattern,
    savedSearch: loadCurrentSavedSearch,
    checkMlNodesAvailable,
  },
});
