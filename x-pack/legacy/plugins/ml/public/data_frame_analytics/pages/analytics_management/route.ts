/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { checkFullLicense } from '../../../license/check_license';
// @ts-ignore
import { checkGetJobsPrivilege } from '../../../privilege/check_privilege';
// @ts-ignore
import { loadCurrentIndexPattern, loadCurrentSavedSearch } from '../../../util/index_utils';
// @ts-ignore
import { loadIndexPatterns } from '../../../util/index_utils';
// @ts-ignore
import { getDataFrameAnalyticsBreadcrumbs } from '../../breadcrumbs';

const template = `<ml-data-frame-analytics-management />`;

uiRoutes.when('/data_frame_analytics/?', {
  template,
  k7Breadcrumbs: getDataFrameAnalyticsBreadcrumbs,
  resolve: {
    CheckLicense: checkFullLicense,
    privileges: checkGetJobsPrivilege,
    indexPattern: loadCurrentIndexPattern,
    indexPatterns: loadIndexPatterns,
    savedSearch: loadCurrentSavedSearch,
  },
});
