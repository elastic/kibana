/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import KbnServer from 'src/legacy/server/kbn_server';
import { PluginSetupContract as SecurityPlugin } from '../../../../plugins/security/server';
import {
  outputService as IngestOutputLib,
  agentConfigService as IngestPolicyLib,
} from '../../../../plugins/ingest_manager/server';
import {
  PluginSetupContract as EncryptedSavedObjectsSetupContract,
  PluginStartContract as EncryptedSavedObjectsStartContract,
} from '../../../../plugins/encrypted_saved_objects/server';

export interface IngestPluginStartContract {
  outputs: IngestOutputLib;
  policies: IngestPolicyLib;
}

export interface FleetPluginsStart {
  security: SecurityPluginStartContract;
  ingest: {
    outputs: IngestOutputLib;
    policies: IngestPolicyLib;
  };
  encryptedSavedObjects: EncryptedSavedObjectsStartContract;
}

export interface FleetPluginsSetup {
  encryptedSavedObjects: EncryptedSavedObjectsSetupContract;
}

export type SecurityPluginSetupContract = Pick<SecurityPlugin, '__legacyCompat'>;
export type SecurityPluginStartContract = Pick<SecurityPlugin, 'authc'>;

export function shim(server: any) {
  const newPlatform = ((server as unknown) as KbnServer).newPlatform;
  const pluginsStart: FleetPluginsStart = {
    security: newPlatform.setup.plugins.security as SecurityPluginStartContract,
    ingest: server.plugins.ingest,
    encryptedSavedObjects: newPlatform.start.plugins
      .encryptedSavedObjects as EncryptedSavedObjectsStartContract,
  };
  const pluginsSetup: FleetPluginsSetup = {
    encryptedSavedObjects: newPlatform.setup.plugins
      .encryptedSavedObjects as EncryptedSavedObjectsSetupContract,
  };

  return {
    pluginsStart,
    pluginsSetup,
  };
}
