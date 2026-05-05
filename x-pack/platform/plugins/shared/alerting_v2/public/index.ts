/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContainerModule } from 'inversify';
import { OnSetup, PluginSetup, PluginStart, Start } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  ALERTING_V2_SECTION_ID,
  ALERTING_V2_RULES_APP_ID,
  ALERTING_V2_ACTION_POLICIES_APP_ID,
  ALERTING_V2_EPISODES_APP_ID,
} from './constants';
import { ActionPoliciesApi } from './services/action_policies_api';
import { RulesApi } from './services/rules_api';
import { WorkflowsApi } from './services/workflows_api';
import { setKibanaServices } from './kibana_services';
import { DynamicRuleFormFlyout } from './create_rule_form_flyout';
import type { AlertingV2PublicStart } from './types';

export type { AlertingV2PublicStart } from './types';
export type { CreateRuleFormFlyoutProps } from './create_rule_form_flyout';

export const module = new ContainerModule(({ bind }) => {
  bind(RulesApi).toSelf().inSingletonScope();
  bind(ActionPoliciesApi).toSelf().inSingletonScope();
  bind(WorkflowsApi).toSelf().inSingletonScope();
  bind(Start).toConstantValue({
    DynamicRuleFormFlyout,
  } satisfies AlertingV2PublicStart);
  bind(OnSetup).toConstantValue((container) => {
    const getStartServices = container.get(CoreSetup('getStartServices'));

    getStartServices().then(([coreStart]) => {
      const diContainer = coreStart.injection.getContainer();
      setKibanaServices({
        http: coreStart.http,
        notifications: coreStart.notifications,
        application: coreStart.application,
        data: diContainer.get(PluginStart('data')) as DataPublicPluginStart,
        dataViews: diContainer.get(PluginStart('dataViews')) as DataViewsPublicPluginStart,
        lens: diContainer.get(PluginStart('lens')) as LensPublicStart,
        expressions: diContainer.get(PluginStart('expressions')) as ExpressionsStart,
        uiActions: diContainer.get(PluginStart('uiActions')) as UiActionsStart,
      });
    });

    const management = container.get(PluginSetup('management')) as ManagementSetup;
    const alertingV2Section = management.sections.register({
      id: ALERTING_V2_SECTION_ID,
      title: 'V2 Alerting Preview',
      tip: 'Start exploring our latest alerts experience',
      order: 1,
    });

    alertingV2Section.registerApp({
      id: ALERTING_V2_RULES_APP_ID,
      title: 'Rules',
      order: 1,
      async mount(params) {
        const [coreStart] = await getStartServices();
        const { mountAlertingV2App } = await import('./application/mount');
        return mountAlertingV2App({
          params,
          container: coreStart.injection.getContainer(),
          coreStart,
        });
      },
    });

    alertingV2Section.registerApp({
      id: ALERTING_V2_EPISODES_APP_ID,
      title: i18n.translate('xpack.alertingV2.management.alertEpisodesNavTitle', {
        defaultMessage: 'Alerts',
      }),
      order: 2,
      async mount(params) {
        const [coreStart] = await getStartServices();
        const { mountEpisodesApp } = await import('./application/mount');
        return mountEpisodesApp({
          params,
          container: coreStart.injection.getContainer(),
          coreStart,
        });
      },
    });

    alertingV2Section.registerApp({
      id: ALERTING_V2_ACTION_POLICIES_APP_ID,
      title: i18n.translate('xpack.alertingV2.management.actionPoliciesNavTitle', {
        defaultMessage: 'Action Policies',
      }),
      order: 3,
      async mount(params) {
        const [coreStart] = await getStartServices();
        const { mountActionPoliciesApp } = await import('./application/mount');
        return mountActionPoliciesApp({
          params,
          container: coreStart.injection.getContainer(),
          coreStart,
        });
      },
    });
  });
});
