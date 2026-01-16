/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseManagementLocator } from '@kbn/license-management-plugin/public/locator';
import type { ManagementAppLocatorParams } from '@kbn/management-plugin/common/locator';
import type { LocatorPublic } from '@kbn/share-plugin/common';

interface AgentBuilderNavigationLocators {
  management: LocatorPublic<ManagementAppLocatorParams>;
  licenseManagement?: LicenseManagementLocator;
}

export class NavigationService {
  private locators: AgentBuilderNavigationLocators;

  constructor(locators: AgentBuilderNavigationLocators) {
    this.locators = locators;
  }

  public hasLicenseManagentLocator() {
    return Boolean(this.locators.licenseManagement);
  }

  public navigateToLicenseManagementDashboard() {
    this.locators.licenseManagement?.navigateSync({ page: 'dashboard' });
  }

  public navigateToLlmConnectorsManagement() {
    this.locators.management.navigateSync({
      sectionId: 'insightsAndAlerting',
      appId: 'triggersActionsConnectors/connectors',
    });
  }
}
