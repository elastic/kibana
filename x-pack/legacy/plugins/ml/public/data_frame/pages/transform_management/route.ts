/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { checkBasicLicense } from '../../../license/check_license';
// @ts-ignore
import { checkGetDataFrameTransformsPrivilege } from '../../../privilege/check_privilege';
// @ts-ignore
import { loadIndexPatterns } from '../../../util/index_utils';
// @ts-ignore
import { getDataFrameBreadcrumbs } from '../../breadcrumbs';

const template = `<ml-data-frame-page />`;

uiRoutes.when('/data_frames/?', {
  template,
  k7Breadcrumbs: getDataFrameBreadcrumbs,
  resolve: {
    CheckLicense: checkBasicLicense,
    privileges: checkGetDataFrameTransformsPrivilege,
    indexPatterns: loadIndexPatterns,
  },
});
