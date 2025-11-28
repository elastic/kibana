/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  WorkflowsServerPluginSetup,
  WorkflowsServerPluginStart,
} from '@kbn/workflows-management-plugin/server';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { SecretResolverService } from './services/secret_resolver';

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface DataConnectorsServerSetup {}

export interface DataConnectorsServerStart {
  secretResolver: SecretResolverService;
}

export interface DataConnectorsServerSetupDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  actions: ActionsPluginSetup;
}

export interface DataConnectorsServerStartDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  workflowsManagement: WorkflowsServerPluginStart;
  onechat?: OnechatPluginStart;
  actions: ActionsPluginStart;
}
