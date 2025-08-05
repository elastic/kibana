/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import type { Version } from '@kbn/upgrade-assistant-pkg-server';
import {
  ReindexServiceScopedClient,
  ReindexServiceScopedClientArgs,
} from './src/lib/reindex_service_wrapper';
import { CredentialStore } from './src/lib/credential_store';

export interface RouteDependencies {
  router: IRouter;
  credentialStore: CredentialStore;
  log: Logger;
  getSecurityPlugin: () => Promise<SecurityPluginStart>;
  licensing: LicensingPluginSetup;
  lib: {
    handleEsError: typeof handleEsError;
  };
  version: Version;
  getReindexService: () => Promise<ReindexServiceServerPluginStart>;
}

export interface ReindexServiceServerPluginStart {
  cleanupReindexOperations: (indexNames: string[]) => Promise<void>;
  getScopedClient: (scopedClientArgs: ReindexServiceScopedClientArgs) => ReindexServiceScopedClient;
}
