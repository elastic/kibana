/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { AuthMode, GetTokenOpts } from '@kbn/connector-specs';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { ConnectorTokenClientContract } from '../../types';

export interface AuthStrategyDeps {
  connectorId: string;
  secrets: Record<string, unknown>;
  connectorTokenClient?: ConnectorTokenClientContract;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  authMode?: AuthMode;
  profileUid?: string;
}

export interface AxiosAuthStrategy {
  /**
   * Attach whichever Axios response interceptor is appropriate for this auth type.
   * Only called when the connectorTokenClient is present.
   */
  installResponseInterceptor(axiosInstance: AxiosInstance, deps: AuthStrategyDeps): void;

  /**
   * Return a bearer token string (or null) for the given GetTokenOpts.
   * Called by configureCtx.getToken inside authType.configure().
   */
  getToken(opts: GetTokenOpts, deps: AuthStrategyDeps): Promise<string | null>;
}
