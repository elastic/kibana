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
import SemVer from 'semver/classes/semver';
import { CredentialStore } from './lib/credential_store';

export interface RouteDependencies {
  router: IRouter;
  credentialStore: CredentialStore;
  log: Logger;
  getSecurityPlugin: () => SecurityPluginStart | undefined;
  licensing: LicensingPluginSetup;
  lib: {
    handleEsError: typeof handleEsError;
  };
  current: SemVer;
}
