/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import uuid from 'uuid';
import { TaskManager } from '../../../task_manager';
import { AlertsClient } from '../alerts_client';
import { AlertTypeRegistry } from '../alert_type_registry';
import { KibanaRequest, Logger } from '../../../../../../src/core/server';
import { PluginSetupContract as SecurityPluginSetupContract } from '../../../../../plugins/security/server';

export interface ConstructorOpts {
  logger: Logger;
  taskManager: TaskManager;
  alertTypeRegistry: AlertTypeRegistry;
  securityPluginSetup?: SecurityPluginSetupContract;
  getSpaceId: (request: Hapi.Request) => string | undefined;
}

export class AlertsClientFactory {
  private readonly logger: Logger;
  private readonly taskManager: TaskManager;
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly securityPluginSetup?: SecurityPluginSetupContract;
  private readonly getSpaceId: (request: Hapi.Request) => string | undefined;

  constructor(options: ConstructorOpts) {
    this.logger = options.logger;
    this.getSpaceId = options.getSpaceId;
    this.taskManager = options.taskManager;
    this.alertTypeRegistry = options.alertTypeRegistry;
    this.securityPluginSetup = options.securityPluginSetup;
  }

  public create(request: KibanaRequest, legacyRequest: Hapi.Request): AlertsClient {
    const { securityPluginSetup } = this;
    return new AlertsClient({
      logger: this.logger,
      taskManager: this.taskManager,
      alertTypeRegistry: this.alertTypeRegistry,
      savedObjectsClient: legacyRequest.getSavedObjectsClient(),
      spaceId: this.getSpaceId(legacyRequest),
      async getUserName() {
        if (!securityPluginSetup) {
          return null;
        }
        const user = await securityPluginSetup.authc.getCurrentUser(request);
        return user ? user.username : null;
      },
      async createAPIKey() {
        if (!securityPluginSetup) {
          return { created: false };
        }
        return {
          created: true,
          result: (await securityPluginSetup.authc.createAPIKey(request, {
            name: `source: alerting, generated uuid: "${uuid.v4()}"`,
            role_descriptors: {},
          }))!,
        };
      },
    });
  }
}
