/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScopedClusterClient, IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../../../plugins/licensing/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { License } from './services';
import { isEsError } from './lib/is_es_error';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  isSlmEnabled: boolean;
  isSecurityEnabled: boolean;
  lib: {
    isEsError: typeof isEsError;
  };
}

export type CallAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];
