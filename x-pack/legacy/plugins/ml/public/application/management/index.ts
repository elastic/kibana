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
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { metadata } from 'ui/metadata';
// @ts-ignore No declaration file for module
import { xpackInfo } from '../../../../xpack_main/public/services/xpack_info';
import { JOBS_LIST_PATH } from './management_urls';
import { LICENSE_TYPE } from '../../../common/constants/license';
import { setDependencyCache } from '../util/dependency_cache';
import './jobs_list';

if (
  xpackInfo.get('features.ml.showLinks', false) === true &&
  xpackInfo.get('features.ml.licenseType') === LICENSE_TYPE.FULL
) {
  const legacyBasePath = {
    prepend: chrome.addBasePath,
    get: chrome.getBasePath,
    remove: () => {},
  };
  const legacyDocLinks = {
    ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
    DOC_LINK_VERSION: metadata.branch,
  };

  setDependencyCache({
    docLinks: legacyDocLinks as any,
    basePath: legacyBasePath as any,
    XSRF: chrome.getXsrfToken(),
  });

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
