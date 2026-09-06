/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb, CoreStart, ScopedHistory } from '@kbn/core/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '../types';
import type { TriggersAndActionsUiServices } from './rules_app';

export interface ClassicRulesPageProps {
  coreStart: CoreStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  /** Host app history. Falls back to an isolated memory history when omitted. */
  history?: ScopedHistory;
}

export type ClassicRulesPagePluginsStart = Pick<
  TriggersAndActionsUiServices,
  | 'data'
  | 'dataViews'
  | 'dataViewEditor'
  | 'charts'
  | 'alerting'
  | 'spaces'
  | 'unifiedSearch'
  | 'licensing'
  | 'expressions'
  | 'fieldFormats'
  | 'lens'
  | 'fieldsMetadata'
  | 'contentManagement'
  | 'share'
  | 'uiActions'
  | 'cps'
  | 'inspector'
> & {
  features: { getFeatures: () => Promise<KibanaFeature[]> };
};

export interface ClassicRulesPageInternalDeps {
  actions: ActionsPublicPluginSetup;
  security: SecurityPluginStart;
  cloud?: CloudSetup;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeRegistry: RuleTypeRegistryContract;
  isServerless: boolean;
  pluginsStart: ClassicRulesPagePluginsStart;
}
