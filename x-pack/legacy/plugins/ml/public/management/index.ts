/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';
// @ts-ignore No declaration file for module
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { i18n } from '@kbn/i18n';
import { JOBS_LIST_PATH } from './management_urls';
import { LICENSE_TYPE } from '../../common/constants/license';
import 'plugins/ml/management/jobs_list';

if (
  xpackInfo.get('features.ml.showLinks', false) === true &&
  xpackInfo.get('features.ml.licenseType') === LICENSE_TYPE.FULL
) {
  management.register('ml', {
    display: i18n.translate('xpack.ml.management.mlTitle', {
      defaultMessage: 'Machine Learning',
    }),
    order: 100,
    icon: 'machineLearningApp',
  });

  management.getSection('ml').register('jobsList', {
    name: 'jobsListLink',
    order: 10,
    display: i18n.translate('xpack.ml.management.jobsListTitle', {
      defaultMessage: 'Jobs list',
    }),
    url: `#${JOBS_LIST_PATH}`,
  });
}
