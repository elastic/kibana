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
import { JOBS_LIST_PATH } from './management_urls';
import { setDependencyCache } from '../util/dependency_cache';
import './jobs_list';
import {
  LicensingPluginSetup,
  LICENSE_CHECK_STATE,
} from '../../../../../../plugins/licensing/public';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';

type PluginsSetupExtended = typeof npSetup.plugins & {
  // adds licensing which isn't in the PluginsSetup interface, but does exist
  licensing: LicensingPluginSetup;
};

const plugins = npSetup.plugins as PluginsSetupExtended;
const licencingSubscription = plugins.licensing.license$.subscribe(license => {
  if (license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === LICENSE_CHECK_STATE.Valid) {
    initManagementSection();
    // unsubscribe, we only want to register the plugin once.
    licencingSubscription.unsubscribe();
  }
});

function initManagementSection() {
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
