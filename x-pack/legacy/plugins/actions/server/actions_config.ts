/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromNullable } from 'fp-ts/lib/Option';
import { URL } from 'url';
import { asOk, asErr, Result } from './builtin_action_types/lib/result_type';

export enum WhitelistedHosts {
  Any = '*',
}

export interface ActionsKibanaConfig {
  enabled: boolean;
  whitelistedHosts: WhitelistedHosts.Any | string[];
}

export interface ActionsConfigurationUtilities {
  isWhitelistedHostname: (uri: string) => Result<string, string>;
}

const whitelistingError = asErr('target url not in whitelist');
export function getActionsConfigurationUtilities(
  config: ActionsKibanaConfig
): ActionsConfigurationUtilities {
  return {
    isWhitelistedHostname(uri: string): Result<string, string> {
      const urlHostname = new URL(uri).hostname;
      switch (config.whitelistedHosts) {
        case WhitelistedHosts.Any:
          return asOk(uri);
        default:
          if (Array.isArray(config.whitelistedHosts)) {
            return fromNullable(config.whitelistedHosts.find(hostname => hostname === urlHostname))
              .map(_ => asOk(uri) as Result<string, string>)
              .getOrElse(whitelistingError as Result<string, string>);
          }
          return whitelistingError;
      }
    },
  };
}
