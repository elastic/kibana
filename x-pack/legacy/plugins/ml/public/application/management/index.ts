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

import { npSetup } from 'ui/new_platform';
import { management } from 'ui/management';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { metadata } from 'ui/metadata';
// @ts-ignore No declaration file for module
import { xpackInfo } from '../../../../xpack_main/public/services/xpack_info';
import { JOBS_LIST_PATH } from './management_urls';
import { VALID_FULL_LICENSE_MODES } from '../../../common/constants/license';
import { setDependencyCache } from '../util/dependency_cache';
import './jobs_list';
import { LicensingPluginSetup, ILicense } from '../../../../../../plugins/licensing/public';

type PluginsSetupExtended = typeof npSetup.plugins & {
  // adds licensing which isn't in the PluginsSetup interface, but does exist
  licensing: LicensingPluginSetup;
};

const plugins = npSetup.plugins as PluginsSetupExtended;
const licencingSubscription = plugins.licensing.license$.subscribe(async license => {
  initManagementSection(license);
  // unsubscribe, we only want to register the plugin once.
  licencingSubscription.unsubscribe();
});

export function initManagementSection(license: ILicense) {
  if (
    license.isActive &&
    license.type !== undefined &&
    VALID_FULL_LICENSE_MODES.includes(license.type)
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
  return true;
}
