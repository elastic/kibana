/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AutomaticImportPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AutomaticImportPluginStart {}

export interface AutomaticImportPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface AutomaticImportPluginStartDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  licensing: LicensingPluginStart;
}
