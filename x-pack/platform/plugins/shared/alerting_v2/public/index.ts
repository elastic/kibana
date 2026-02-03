/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContainerModule } from 'inversify';
import { OnSetup, PluginSetup } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-browser';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { mountAlertingV2App } from './main';
import { ALERTING_V2_APP_ID } from './constants';
import { RulesApi } from './services/rules_api';

export const module = new ContainerModule(({ bind }) => {
  bind(RulesApi).toSelf().inSingletonScope();
  bind(OnSetup).toConstantValue((container) => {
    const getStartServices = container.get(CoreSetup('getStartServices'));

    if (!container.isBound(PluginSetup('management'))) {
      return;
    }

    const management = container.get(PluginSetup('management')) as ManagementSetup;
    management.sections.section.insightsAndAlerting.registerApp({
      id: ALERTING_V2_APP_ID,
      title: 'Rules V2',
      order: 1,
      async mount(params) {
        const [coreStart] = await getStartServices();
        return mountAlertingV2App({ params, container: coreStart.injection.getContainer() });
      },
    });
  });
});
