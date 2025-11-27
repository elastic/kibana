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
import type { CreateIntegrationComponent } from './components/create_integration/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AutomaticImportPluginSetup {}

export interface AutomaticImportPluginStart {
  components: {
    /**
     * Component that allows the user to create an integration.
     */
    CreateIntegration: CreateIntegrationComponent;
  };

  // TODO: Include renderUpselling function in the future
}

export interface AutomaticImportPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface AutomaticImportPluginStartDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  licensing: LicensingPluginStart;
}
