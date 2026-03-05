/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';

import { AgentFlyoutPage } from './agent_flyout_page';
import { AgentListPage } from './agent_list_page';
import { AgentPolicyPage } from './agent_policy_page';
import { BrowseIntegrationPage } from './browse_integrations_page';
import { CopyIntegrationPage } from './copy_integration_page';
import { CreateIntegrationLandingPage } from './create_integration_landing_page';
import { EnrollmentTokensPage } from './enrollment_tokens_page';
import { FleetHomePage } from './fleet_home';
import { FleetOutputsPage } from './fleet_outputs_page';
import { FleetSettingsPage } from './fleet_settings_page';
import { IntegrationHomePage } from './integration_home';
import { PackagePolicyPage } from './package_policy_page';
import { UninstallTokensPage } from './uninstall_tokens_page';

export interface FleetPageObjects extends PageObjects {
  agentFlyout: AgentFlyoutPage;
  agentList: AgentListPage;
  agentPolicy: AgentPolicyPage;
  browseIntegrations: BrowseIntegrationPage;
  copyIntegration: CopyIntegrationPage;
  createIntegrationLanding: CreateIntegrationLandingPage;
  enrollmentTokens: EnrollmentTokensPage;
  fleetHome: FleetHomePage;
  fleetOutputs: FleetOutputsPage;
  fleetSettings: FleetSettingsPage;
  integrationHome: IntegrationHomePage;
  packagePolicy: PackagePolicyPage;
  uninstallTokens: UninstallTokensPage;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): FleetPageObjects {
  return {
    ...pageObjects,
    agentFlyout: createLazyPageObject(AgentFlyoutPage, page),
    agentList: createLazyPageObject(AgentListPage, page),
    agentPolicy: createLazyPageObject(AgentPolicyPage, page),
    browseIntegrations: createLazyPageObject(BrowseIntegrationPage, page),
    copyIntegration: createLazyPageObject(CopyIntegrationPage, page),
    createIntegrationLanding: createLazyPageObject(CreateIntegrationLandingPage, page),
    enrollmentTokens: createLazyPageObject(EnrollmentTokensPage, page),
    fleetHome: createLazyPageObject(FleetHomePage, page),
    fleetOutputs: createLazyPageObject(FleetOutputsPage, page),
    fleetSettings: createLazyPageObject(FleetSettingsPage, page),
    integrationHome: createLazyPageObject(IntegrationHomePage, page),
    packagePolicy: createLazyPageObject(PackagePolicyPage, page),
    uninstallTokens: createLazyPageObject(UninstallTokensPage, page),
  };
}
