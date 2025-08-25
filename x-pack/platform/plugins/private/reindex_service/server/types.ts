/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import type { Version } from '@kbn/upgrade-assistant-pkg-server';
import type { CredentialStore } from './src/lib/credential_store';

export interface RouteDependencies {
  router: IRouter;
  credentialStore: CredentialStore;
  log: Logger;
  getSecurityPlugin: () => SecurityPluginStart | undefined;
  licensing: LicensingPluginSetup;
  lib: {
    handleEsError: typeof handleEsError;
  };
  version: Version;
}

export interface ReindexServiceServerPluginStart {
  cleanupReindexOperations: (indexNames: string[]) => Promise<void>;
}
