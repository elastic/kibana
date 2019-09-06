/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { tryCatch, fromNullable, isSome, map, mapNullable, getOrElse } from 'fp-ts/lib/Option';
import { URL } from 'url';
import { curry } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';

export enum WhitelistedHosts {
  Any = '*',
}

enum WhitelistingField {
  url = 'url',
  hostname = 'hostname',
}

export interface ActionsKibanaConfig {
  enabled: boolean;
  whitelistedHosts: string[];
}

export interface ActionsConfigurationUtilities {
  isWhitelistedHostname: (hostname: string) => boolean;
  isWhitelistedUri: (uri: string) => boolean;
  ensureWhitelistedHostname: (hostname: string) => void;
  ensureWhitelistedUri: (uri: string) => void;
}

function whitelistingErrorMessage(field: WhitelistingField, value: string) {
  return i18n.translate('xpack.actions.urlWhitelistConfigurationError', {
    defaultMessage: 'target {field} "{value}" is not in the Kibana whitelist',
    values: {
      value,
      field,
    },
  });
}

function doesValueWhitelistAnyHostname(whitelistedHostname: string): boolean {
  return whitelistedHostname === WhitelistedHosts.Any;
}

function isWhitelisted({ whitelistedHosts }: ActionsKibanaConfig, hostname: string): boolean {
  return (
    Array.isArray(whitelistedHosts) &&
    isSome(
      fromNullable(
        whitelistedHosts.find(
          whitelistedHostname =>
            doesValueWhitelistAnyHostname(whitelistedHostname) || whitelistedHostname === hostname
        )
      )
    )
  );
}

function isWhitelistedHostnameInUri(config: ActionsKibanaConfig, uri: string): boolean {
  return pipe(
    tryCatch(() => new URL(uri)),
    map(url => url.hostname),
    mapNullable(hostname => isWhitelisted(config, hostname)),
    getOrElse(() => false)
  );
}

export function getActionsConfigurationUtilities(
  config: ActionsKibanaConfig
): ActionsConfigurationUtilities {
  const isWhitelistedHostname = curry(isWhitelisted)(config);
  const isWhitelistedUri = curry(isWhitelistedHostnameInUri)(config);
  return {
    isWhitelistedHostname,
    isWhitelistedUri,
    ensureWhitelistedUri(uri: string) {
      if (!isWhitelistedUri(uri)) {
        throw new Error(whitelistingErrorMessage(WhitelistingField.url, uri));
      }
    },
    ensureWhitelistedHostname(hostname: string) {
      if (!isWhitelistedHostname(hostname)) {
        throw new Error(whitelistingErrorMessage(WhitelistingField.hostname, hostname));
      }
    },
  };
}
