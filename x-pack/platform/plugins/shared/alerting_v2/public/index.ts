/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContainerModule } from 'inversify';
import { OnSetup, PluginSetup, PluginStart, Start } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-browser';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { NotificationPoliciesApi } from './services/notification_policies_api';
import { RulesApi } from './services/rules_api';
import { WorkflowsApi } from './services/workflows_api';
import {
  AlertingV2RuleDetailsLocatorDefinition,
  AlertingV2RuleEditLocatorDefinition,
  AlertingV2RuleCreateLocatorDefinition,
} from './locators';
import { setKibanaServices, setContainer } from './kibana_services';
import { DynamicRuleFormFlyout } from './create_rule_form_flyout';
import { LazyRulesList } from './lazy_rules_list';
import type { AlertingV2PublicStart } from './types';

export type { AlertingV2PublicStart } from './types';
export type { CreateRuleFormFlyoutProps } from './create_rule_form_flyout';

export const module = new ContainerModule(({ bind }) => {
  bind(RulesApi).toSelf().inSingletonScope();
  bind(NotificationPoliciesApi).toSelf().inSingletonScope();
  bind(WorkflowsApi).toSelf().inSingletonScope();
  bind(Start).toConstantValue({
    DynamicRuleFormFlyout,
    RulesListV2: LazyRulesList,
  } satisfies AlertingV2PublicStart);
  bind(OnSetup).toConstantValue((container) => {
    const getStartServices = container.get(CoreSetup('getStartServices'));

    const share = container.get(PluginSetup('share')) as SharePluginSetup;
    share.url.locators.create(new AlertingV2RuleDetailsLocatorDefinition());
    share.url.locators.create(new AlertingV2RuleEditLocatorDefinition());
    share.url.locators.create(new AlertingV2RuleCreateLocatorDefinition());

    getStartServices().then(([coreStart]) => {
      const diContainer = coreStart.injection.getContainer();
      setContainer(diContainer);
      setKibanaServices({
        http: coreStart.http,
        notifications: coreStart.notifications,
        application: coreStart.application,
        data: diContainer.get(PluginStart('data')) as DataPublicPluginStart,
        dataViews: diContainer.get(PluginStart('dataViews')) as DataViewsPublicPluginStart,
        lens: diContainer.get(PluginStart('lens')) as LensPublicStart,
      });
    });
  });
});
