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

import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { management } from 'ui/management';
import { i18n } from '@kbn/i18n';
import { JOBS_LIST_PATH } from './management_urls';
import 'plugins/ml/management/jobs_list';

// TODO: Do we need to check xpackInfo.get('features.ml.isAvailable', false)?
if (xpackInfo.get('features.ml.showLinks', false) === true) {
  management.register('ml', {
    display: i18n.translate(
      'xpack.ml.management.mlTitle', {
        defaultMessage: 'Machine Learning',
      }),
    order: 100,
    icon: 'machineLearningApp',
  });

  management.getSection('ml').register('jobsList', {
    name: 'jobsListLink',
    order: 10,
    display: i18n.translate(
      'xpack.ml.management.jobsListTitle', {
        defaultMessage: 'Jobs list',
      }),
    url: `#${JOBS_LIST_PATH}`,
  });
}
