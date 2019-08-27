/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { checkBasicLicense } from '../../../license/check_license';
import { checkCreateDataFrameTransformPrivilege } from '../../../privilege/check_privilege';
import {
  loadCurrentIndexPattern,
  loadCurrentSavedSearch,
  loadIndexPatterns,
  // @ts-ignore
} from '../../../util/index_utils';
import indexOrSearchTemplate from '../../../jobs/new_job/wizard/steps/index_or_search/index_or_search.html';

import {
  getDataFrameCreateBreadcrumbs,
  getDataFrameIndexOrSearchBreadcrumbs,
} from '../../breadcrumbs';

const wizardTemplate = `<ml-new-data-frame />`;

uiRoutes.when('/data_frames/new_transform/step/pivot?', {
  template: wizardTemplate,
  k7Breadcrumbs: getDataFrameCreateBreadcrumbs,
  resolve: {
    CheckLicense: checkBasicLicense,
    privileges: checkCreateDataFrameTransformPrivilege,
    indexPattern: loadCurrentIndexPattern,
    savedSearch: loadCurrentSavedSearch,
  },
});

uiRoutes.when('/data_frames/new_transform', {
  redirectTo: '/data_frames/new_transform/step/index_or_search',
});

uiRoutes.when('/data_frames/new_transform/step/index_or_search', {
  template: indexOrSearchTemplate,
  k7Breadcrumbs: getDataFrameIndexOrSearchBreadcrumbs,
  resolve: {
    CheckLicense: checkBasicLicense,
    privileges: checkCreateDataFrameTransformPrivilege,
    indexPatterns: loadIndexPatterns,
    nextStepPath: () => '#data_frames/new_transform/step/pivot',
  },
});
