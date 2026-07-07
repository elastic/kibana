/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
  SecurityServiceStart,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core/server';
import { MaintenanceWindowClient } from './client';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../common';

export interface MaintenanceWindowClientFactoryOpts {
  logger: Logger;
  savedObjectsService: SavedObjectsServiceStart;
  securityService: SecurityServiceStart;
  uiSettings: UiSettingsServiceStart;
}

export class MaintenanceWindowClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private savedObjectsService!: SavedObjectsServiceStart;
  private securityService!: SecurityServiceStart;
  private uiSettings!: UiSettingsServiceStart;

  public initialize(options: MaintenanceWindowClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('MaintenanceWindowClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.savedObjectsService = options.savedObjectsService;
    this.securityService = options.securityService;
    this.uiSettings = options.uiSettings;
  }

  private getSoClient(request: KibanaRequest, withAuth: boolean): SavedObjectsClientContract {
    return this.savedObjectsService.getScopedClient(request, {
      includedHiddenTypes: [MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE],
      ...(withAuth ? {} : { excludedExtensions: [SECURITY_EXTENSION_ID] }),
    });
  }

  private createMaintenanceWindowClient(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const { securityService } = this;
    const uiSettingClient = this.uiSettings.asScopedToClient(savedObjectsClient);

    return new MaintenanceWindowClient({
      logger: this.logger,
      savedObjectsClient,
      uiSettings: uiSettingClient,
      async getUserName() {
        const user = securityService.authc.getCurrentUser(request);
        return user?.username ?? null;
      },
    });
  }

  public createWithAuthorization(request: KibanaRequest) {
    const soClient = this.getSoClient(request, true);
    return this.createMaintenanceWindowClient(request, soClient);
  }

  public createWithoutAuthorization(request: KibanaRequest) {
    const soClient = this.getSoClient(request, false);
    return this.createMaintenanceWindowClient(request, soClient);
  }

  public createInternal(request: KibanaRequest) {
    const savedObjectsInternalClient = this.savedObjectsService.createInternalRepository([
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    ]);
    return this.createMaintenanceWindowClient(request, savedObjectsInternalClient);
  }
}
