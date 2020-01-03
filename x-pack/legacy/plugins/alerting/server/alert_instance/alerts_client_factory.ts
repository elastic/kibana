/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import uuid from 'uuid';
import { AlertTypeRegistry } from '../types';
import { AlertsClient } from '../alerts_client';
import { SecurityPluginStartContract, TaskManagerStartContract } from '../shim';
import { KibanaRequest, Logger } from '../../../../../../src/core/server';

export interface ConstructorOpts {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  alertTypeRegistry: AlertTypeRegistry;
  securityPluginSetup?: SecurityPluginStartContract;
  getSpaceId: (request: Hapi.Request) => string | undefined;
}

export class AlertsClientFactory {
  private readonly logger: Logger;
  private readonly taskManager: TaskManagerStartContract;
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly securityPluginSetup?: SecurityPluginStartContract;
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
        const createAPIKeyResult = await securityPluginSetup.authc.createAPIKey(request, {
          name: `source: alerting, generated uuid: "${uuid.v4()}"`,
          role_descriptors: {},
        });
        if (!createAPIKeyResult) {
          return { created: false };
        }
        return {
          created: true,
          result: createAPIKeyResult,
        };
      },
    });
  }
}
