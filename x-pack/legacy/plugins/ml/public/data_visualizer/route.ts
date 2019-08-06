/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import uiRoutes from 'ui/routes';
import { checkBasicLicense } from '../license/check_license';
// @ts-ignore
import { checkGetJobsPrivilege } from '../privilege/check_privilege';
// @ts-ignore
import { loadCurrentIndexPattern, loadCurrentSavedSearch } from '../util/index_utils';
// @ts-ignore
import { checkMlNodesAvailable } from '../ml_nodes_check/check_ml_nodes';
// @ts-ignore
import { getDataVisualizerBreadcrumbs } from './breadcrumbs';

const template = `<ml-nav-menu name="datavisualizer" /><ml-data-visualizer />`;

uiRoutes.when('/data_visualizer', {
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
