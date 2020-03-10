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

import { npSetup, npStart } from 'ui/new_platform';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { metadata } from 'ui/metadata';
import { take } from 'rxjs/operators';
import { setDependencyCache } from '../util/dependency_cache';
import { renderApp } from './jobs_list';
import {
  LicensingPluginSetup,
  LICENSE_CHECK_STATE,
} from '../../../../../../plugins/licensing/public';
import { ManagementSetup } from '../../../../../../../src/plugins/management/public';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';

type PluginsSetupExtended = typeof npSetup.plugins & {
  // adds licensing which isn't in the PluginsSetup interface, but does exist
  licensing: LicensingPluginSetup;
};

const plugins = npSetup.plugins as PluginsSetupExtended;
// only need to register once
const licensing = plugins.licensing.license$.pipe(take(1));
licensing.subscribe(license => {
  if (license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === LICENSE_CHECK_STATE.Valid) {
    initManagementSection(plugins.management);
  }
});
function initManagementSection(management: ManagementSetup) {
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
    http: npStart.core.http,
  });

  const mlSection = management.sections.register({
    id: 'ml',
    title: i18n.translate('xpack.ml.management.mlTitle', {
      defaultMessage: 'Machine Learning',
    }),
    order: 100,
    icon: 'machineLearningApp',
  });

  mlSection.registerApp({
    id: 'jobsListLink',
    title: i18n.translate('xpack.ml.management.jobsListTitle', {
      defaultMessage: 'Jobs list',
    }),
    order: 10,
    async mount(params) {
      return renderApp(params.element, {});
    },
  });
}
