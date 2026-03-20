/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContainerModule } from 'inversify';
import { OnSetup, OnStart, PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-browser';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { mountAlertingV2App } from './main';
import { ALERTING_V2_APP_ID } from './constants';
import { NotificationPoliciesApi } from './services/notification_policies_api';
import { RulesApi } from './services/rules_api';
import { WorkflowsApi } from './services/workflows_api';

export const module = new ContainerModule(({ bind }) => {
  bind(RulesApi).toSelf().inSingletonScope();
  bind(NotificationPoliciesApi).toSelf().inSingletonScope();
  bind(WorkflowsApi).toSelf().inSingletonScope();
  bind(OnSetup).toConstantValue((container) => {
    const getStartServices = container.get(CoreSetup('getStartServices'));

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

  bind(OnStart).toConstantValue((container) => {
    if (container.isBound(PluginStart<AgentBuilderPluginStart>('agentBuilder'))) {
      const agentBuilder = container.get(PluginStart<AgentBuilderPluginStart>('agentBuilder'));
      const share = container.get(PluginStart<SharePluginStart>('share'));
      const data = container.get(PluginStart<DataPublicPluginStart>('data'));
      const dataViews = container.get(PluginStart<DataViewsPublicPluginStart>('dataViews'));
      const http = container.get(CoreStart('http'));
      const notifications = container.get(CoreStart('notifications'));
      const application = container.get(CoreStart('application'));

      import('./attachment_types/data_source_description').then(
        ({ registerDataSourceDescriptionAttachment }) => {
          registerDataSourceDescriptionAttachment({ agentBuilder, share, data });
        }
      );

      import('./attachment_types/rule').then(({ registerRuleAttachment }) => {
        registerRuleAttachment({
          agentBuilder,
          http,
          data,
          dataViews,
          notifications,
          application,
        });
      });
    }
  });
});
