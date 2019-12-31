/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import uuid from 'uuid';
import { AlertsClient } from '../alerts_client';
import { AlertTypeRegistry, SpaceIdToNamespaceFunction } from '../types';
import { SecurityPluginStartContract, TaskManagerStartContract } from '../shim';
import { KibanaRequest, Logger } from '../../../../../../src/core/server';
import { InvalidateAPIKeyParams } from '../../../../../plugins/security/server';
import { PluginStartContract as EncryptedSavedObjectsStartContract } from '../../../../../plugins/encrypted_saved_objects/server';

export interface ConstructorOpts {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  alertTypeRegistry: AlertTypeRegistry;
  securityPluginSetup?: SecurityPluginStartContract;
  getSpaceId: (request: Hapi.Request) => string | undefined;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsStartContract;
}

export class AlertsClientFactory {
  private readonly logger: Logger;
  private readonly taskManager: TaskManagerStartContract;
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly securityPluginSetup?: SecurityPluginStartContract;
  private readonly getSpaceId: (request: Hapi.Request) => string | undefined;
  private readonly spaceIdToNamespace: SpaceIdToNamespaceFunction;
  private readonly encryptedSavedObjectsPlugin: EncryptedSavedObjectsStartContract;

  constructor(options: ConstructorOpts) {
    this.logger = options.logger;
    this.getSpaceId = options.getSpaceId;
    this.taskManager = options.taskManager;
    this.alertTypeRegistry = options.alertTypeRegistry;
    this.securityPluginSetup = options.securityPluginSetup;
    this.spaceIdToNamespace = options.spaceIdToNamespace;
    this.encryptedSavedObjectsPlugin = options.encryptedSavedObjectsPlugin;
  }

  public create(request: KibanaRequest, legacyRequest: Hapi.Request): AlertsClient {
    const { securityPluginSetup } = this;
    const spaceId = this.getSpaceId(legacyRequest);
    return new AlertsClient({
      spaceId,
      logger: this.logger,
      taskManager: this.taskManager,
      alertTypeRegistry: this.alertTypeRegistry,
      savedObjectsClient: legacyRequest.getSavedObjectsClient(),
      namespace: this.spaceIdToNamespace(spaceId),
      encryptedSavedObjectsPlugin: this.encryptedSavedObjectsPlugin,
      async getUserName() {
        if (!securityPluginSetup) {
          return null;
        }
        const user = await securityPluginSetup.authc.getCurrentUser(request);
        return user ? user.username : null;
      },
      async createAPIKey() {
        if (!securityPluginSetup) {
          return { apiKeysEnabled: false };
        }
        const createAPIKeyResult = await securityPluginSetup.authc.createAPIKey(request, {
          name: `source: alerting, generated uuid: "${uuid.v4()}"`,
          role_descriptors: {},
        });
        if (!createAPIKeyResult) {
          return { apiKeysEnabled: false };
        }
        return {
          apiKeysEnabled: true,
          result: createAPIKeyResult,
        };
      },
      async invalidateAPIKey(params: InvalidateAPIKeyParams) {
        if (!securityPluginSetup) {
          return { apiKeysEnabled: false };
        }
        const invalidateAPIKeyResult = await securityPluginSetup.authc.invalidateAPIKey(
          request,
          params
        );
        // Null when Elasticsearch security is disabled
        if (!invalidateAPIKeyResult) {
          return { apiKeysEnabled: false };
        }
        return {
          apiKeysEnabled: true,
          result: invalidateAPIKeyResult,
        };
      },
    });
  }
}
