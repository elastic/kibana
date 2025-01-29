/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { CoreSetup } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { MlFeatures } from '../../../common/constants/app';
import type { MlStartDependencies } from '../../plugin';

export function registerManagementSection(
  management: ManagementSetup,
  core: CoreSetup<MlStartDependencies>,
  deps: { usageCollection?: UsageCollectionSetup },
  isServerless: boolean,
  mlFeatures: MlFeatures
) {
  const appName = i18n.translate('xpack.ml.management.jobsListTitle', {
    defaultMessage: 'Machine Learning',
  });

  return management.sections.section.insightsAndAlerting.registerApp({
    id: 'jobsListLink',
    title: appName,
    order: 4,
    async mount(params: ManagementAppMountParams) {
      const [{ chrome }] = await core.getStartServices();
      const { docTitle } = chrome;

      docTitle.change(appName);

      const { mountApp } = await import('./jobs_list');
      const unmountAppCallback = await mountApp(core, params, deps, isServerless, mlFeatures);

      return () => {
        docTitle.reset();
        unmountAppCallback();
      };
    },
  });
}
