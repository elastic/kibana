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
import type { useGetAllIntegrations, useGetIntegrationById } from './common';
import type { CreateIntegrationComponent } from './components/create_integration/types';
import type { CreateIntegrationSideCardButtonComponent } from './components/create_integration_card_button/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AutomaticImportV2PluginSetup {}

export interface AutomaticImportV2PluginStart {
  hooks: {
    useGetIntegrationById: typeof useGetIntegrationById;
    useGetAllIntegrations: typeof useGetAllIntegrations;
  };
  components: {
    /**
     * Component that allows the user to create an integration.
     */
    CreateIntegration: CreateIntegrationComponent;
    /**
     * Component that links the user to the create integration component.
     */
    CreateIntegrationSideCardButton: CreateIntegrationSideCardButtonComponent;
  };
}

export interface AutomaticImportPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface AutomaticImportPluginStartDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  licensing: LicensingPluginStart;
}
