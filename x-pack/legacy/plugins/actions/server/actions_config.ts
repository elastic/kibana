/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromNullable } from 'fp-ts/lib/Option';

export interface ActionsKibanaConfig {
  enabled: boolean;
  whitelistedHosts: 'any' | 'none' | string[];
}

export interface ActionsConfigurationUtilities {
  isWhitelistedHostname: (uri: string) => boolean;
}

export function getActionsConfigurationUtilities(
  config: ActionsKibanaConfig
): ActionsConfigurationUtilities {
  return {
    isWhitelistedHostname(uri: string) {
      switch (config.whitelistedHosts) {
        case 'none':
          return false;
        case 'any':
          return true;
        default:
          if (Array.isArray(config.whitelistedHosts)) {
            const urlHostname = new URL(uri).hostname;
            return fromNullable(
              config.whitelistedHosts.find(hostname => hostname === urlHostname)
            ).isSome();
          }
          return false;
      }
    },
  };
}
