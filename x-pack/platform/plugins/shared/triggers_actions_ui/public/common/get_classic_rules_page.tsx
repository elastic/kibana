/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentType } from 'react';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type {
  ClassicRulesPageInternalDeps,
  ClassicRulesPagePluginsStart,
  ClassicRulesPageProps,
} from '../application/classic_rules_page';
import type {
  ActionTypeRegistryContract,
  ConnectorServices,
  RuleTypeRegistryContract,
} from '../types';

const LazyComposableClassicRulesPage = React.lazy(() =>
  import('../application/composable_rules_page').then((m) => ({
    default: m.ComposableClassicRulesPage,
  }))
);

export interface GetClassicRulesPageParams {
  actions?: ActionsPublicPluginSetup;
  connectorServices?: ConnectorServices;
  security: SecurityPluginStart;
  cloud?: CloudSetup;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeRegistry: RuleTypeRegistryContract;
  isServerless: boolean;
  pluginsStart: ClassicRulesPagePluginsStart;
}

/**
 * Builds a stable Classic Rules page component. Call once per plugin start and
 * reuse the returned type — a new type per render remounts the page.
 */
export const getClassicRulesPageLazy = ({
  actions,
  connectorServices,
  security,
  cloud,
  actionTypeRegistry,
  ruleTypeRegistry,
  isServerless,
  pluginsStart,
}: GetClassicRulesPageParams): ComponentType<ClassicRulesPageProps> => {
  const internalDeps: ClassicRulesPageInternalDeps = {
    actions:
      actions ??
      ({
        validateEmailAddresses: connectorServices?.validateEmailAddresses ?? (() => []),
        enabledEmailServices: connectorServices?.enabledEmailServices ?? [],
      } as ActionsPublicPluginSetup),
    security,
    cloud,
    actionTypeRegistry,
    ruleTypeRegistry,
    isServerless,
    pluginsStart,
  };

  return function ClassicRulesPage(props: ClassicRulesPageProps) {
    return (
      <React.Suspense fallback={null}>
        <LazyComposableClassicRulesPage {...props} internalDeps={internalDeps} />
      </React.Suspense>
    );
  };
};
