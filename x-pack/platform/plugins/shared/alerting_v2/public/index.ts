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
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  ALERTING_V2_SECTION_ID,
  ALERTING_V2_RULES_APP_ID,
  ALERTING_V2_NOTIFICATION_POLICIES_APP_ID,
  ALERTING_V2_EPISODES_APP_ID,
  ALERTING_V2_RULE_DOCTOR_APP_ID,
} from './constants';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '../common/experimental_features';
import { NotificationPoliciesApi } from './services/notification_policies_api';
import { RulesApi } from './services/rules_api';
import { RuleDoctorApi } from './services/rule_doctor_api';
import { WorkflowsApi } from './services/workflows_api';
import { setKibanaServices } from './kibana_services';
import { DynamicRuleFormFlyout } from './create_rule_form_flyout';
import type { AlertingV2PublicStart } from './types';

export type { AlertingV2PublicStart } from './types';
export type { CreateRuleFormFlyoutProps } from './create_rule_form_flyout';

export const module = new ContainerModule(({ bind }) => {
  bind(RulesApi).toSelf().inSingletonScope();
  bind(NotificationPoliciesApi).toSelf().inSingletonScope();
  bind(WorkflowsApi).toSelf().inSingletonScope();
  bind(RuleDoctorApi).toSelf().inSingletonScope();
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

      const agentBuilderToken = PluginStart('agentBuilder');
      if (diContainer.isBound(agentBuilderToken)) {
        const agentBuilder = diContainer.get(agentBuilderToken) as AgentBuilderPluginStart;
        if (agentBuilder.attachments) {
          import('./agent_builder/proposed_change_attachment').then(
            ({ registerProposedChangeAttachment }) => {
              registerProposedChangeAttachment({
                attachments: agentBuilder.attachments,
                container: diContainer,
              });
            }
          );
        }
      }
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
      id: ALERTING_V2_NOTIFICATION_POLICIES_APP_ID,
      title: 'Notification Policies',
      order: 3,
      async mount(params) {
        const [coreStart] = await getStartServices();
        const { mountNotificationPoliciesApp } = await import('./application/mount');
        return mountNotificationPoliciesApp({
          params,
          container: coreStart.injection.getContainer(),
          coreStart,
        });
      },
    });

    const ruleDoctorApp = alertingV2Section.registerApp({
      id: ALERTING_V2_RULE_DOCTOR_APP_ID,
      title: 'Rule Doctor',
      order: 4,
      async mount() {
        const [coreStart] = await getStartServices();
        const { paths: appPaths } = await import('./constants');
        coreStart.application.navigateToUrl(
          coreStart.http.basePath.prepend(appPaths.ruleDoctor)
        );
        return () => {};
      },
    });

    getStartServices().then(([coreStart]) => {
      const isEnabled = coreStart.uiSettings.get<boolean>(
        ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
        false
      );
      if (!isEnabled) {
        ruleDoctorApp.disable();
      }
    });
  });
});
