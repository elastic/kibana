/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromNullable } from 'fp-ts/lib/Option';
import { URL } from 'url';

export enum WhitelistedHosts {
  Any = '*',
}

export interface ActionsKibanaConfig {
  enabled: boolean;
  whitelistedHosts: WhitelistedHosts.Any | string[];
}

export interface ActionsConfigurationUtilities {
  isWhitelistedHostname: (uri: string) => boolean;
}

export function getActionsConfigurationUtilities(
  config: ActionsKibanaConfig
): ActionsConfigurationUtilities {
  return {
    isWhitelistedHostname(uri: string): boolean {
      switch (config.whitelistedHosts) {
        case WhitelistedHosts.Any:
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
