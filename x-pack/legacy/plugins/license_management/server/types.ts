/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScopedClusterClient, IRouter } from 'kibana/server';

import { LicensingPluginSetup } from '../../../../plugins/licensing/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { isEsError } from './lib/is_es_error';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  pluggins: {
    licensing: LicensingPluginSetup;
  };
  lib: {
    isEsError: typeof isEsError;
  };
  config: {
    isSecurityEnabled: boolean;
  };
}

export type CallAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];

export type CallAsInternalUser = ScopedClusterClient['callAsInternalUser'];
