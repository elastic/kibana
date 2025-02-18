/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementApp, ManagementSetup } from '@kbn/management-plugin/public';

import {
  spacesManagementApp,
  type CreateParams as SpacesManagementAppCreateParams,
} from './spaces_management_app';

interface SetupDeps extends SpacesManagementAppCreateParams {
  management: ManagementSetup;
}

export class ManagementService {
  private registeredSpacesManagementApp?: ManagementApp;

  public setup({
    getStartServices,
    management,
    spacesManager,
    config,
    logger,
    getIsRoleManagementEnabled,
    getRolesAPIClient,
    eventTracker,
    getPrivilegesAPIClient,
    isServerless,
    getSecurityLicense,
  }: SetupDeps) {
    this.registeredSpacesManagementApp = management.sections.section.kibana.registerApp(
      spacesManagementApp.create({
        getStartServices,
        spacesManager,
        config,
        logger,
        getIsRoleManagementEnabled,
        getRolesAPIClient,
        eventTracker,
        getPrivilegesAPIClient,
        isServerless,
        getSecurityLicense,
      })
    );
  }

  public stop() {
    this.disableSpacesApp();
  }

  private disableSpacesApp() {
    if (this.registeredSpacesManagementApp) {
      this.registeredSpacesManagementApp.disable();
    }
  }
}
