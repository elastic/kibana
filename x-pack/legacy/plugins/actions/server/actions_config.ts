/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { tryCatch } from 'fp-ts/lib/Option';
import { URL } from 'url';
import { curry } from 'lodash';

export enum WhitelistedHosts {
  Any = '*',
}

export interface ActionsKibanaConfig {
  enabled: boolean;
  whitelistedHosts: string[];
}

export class NotWhitelistedError extends Error {
  constructor(message: string) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}

export interface ActionsConfigurationUtilities {
  isWhitelistedHostname: (hostname: string) => string | NotWhitelistedError;
  isWhitelistedUri: (uri: string) => string | NotWhitelistedError;
}

const whitelistingErrorMessage = 'target url not in whitelist';
const doesValueWhitelistAnyHostname = (whitelistedHostname: string): boolean =>
  whitelistedHostname === WhitelistedHosts.Any;

function isWhitelisted(
  config: ActionsKibanaConfig,
  hostname: string
): string | NotWhitelistedError {
  if (
    Array.isArray(config.whitelistedHosts) &&
    config.whitelistedHosts.find(
      whitelistedHostname =>
        doesValueWhitelistAnyHostname(whitelistedHostname) || whitelistedHostname === hostname
    )
  ) {
    return hostname;
  }
  return new NotWhitelistedError(whitelistingErrorMessage);
}
export function getActionsConfigurationUtilities(
  config: ActionsKibanaConfig
): ActionsConfigurationUtilities {
  const isWhitelistedHostname = curry(isWhitelisted)(config);
  return {
    isWhitelistedUri(uri: string): string | NotWhitelistedError {
      return tryCatch(() => new URL(uri))
        .map(url => url.hostname)
        .map(hostname => {
          const result = isWhitelistedHostname(hostname);
          if (result instanceof NotWhitelistedError) {
            return result;
          } else {
            return uri;
          }
        })
        .getOrElse(new NotWhitelistedError(whitelistingErrorMessage));
    },
    isWhitelistedHostname,
  };
}
