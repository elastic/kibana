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

import { ActionsConfigType } from './types';

export enum WhitelistedHosts {
  Any = '*',
}

export enum EnabledActionTypes {
  Any = '*',
}

enum WhitelistingField {
  url = 'url',
  hostname = 'hostname',
}

export interface ActionsConfigurationUtilities {
  isWhitelistedHostname: (hostname: string) => boolean;
  isWhitelistedUri: (uri: string) => boolean;
  isActionTypeEnabled: (actionType: string) => boolean;
  ensureWhitelistedHostname: (hostname: string) => void;
  ensureWhitelistedUri: (uri: string) => void;
  ensureActionTypeEnabled: (actionType: string) => void;
}

function whitelistingErrorMessage(field: WhitelistingField, value: string) {
  return i18n.translate('xpack.actions.urlWhitelistConfigurationError', {
    defaultMessage:
      'target {field} "{value}" is not whitelisted in the Kibana config xpack.actions.whitelistedHosts',
    values: {
      value,
      field,
    },
  });
}

function disabledActionTypeErrorMessage(actionType: string) {
  return i18n.translate('xpack.actions.disabledActionTypeError', {
    defaultMessage:
      'action type "{actionType}" is not enabled in the Kibana config xpack.actions.enabledTypes',
    values: {
      actionType,
    },
  });
}

function doesValueWhitelistAnyHostname(whitelistedHostname: string): boolean {
  return whitelistedHostname === WhitelistedHosts.Any;
}

function isWhitelisted({ whitelistedHosts }: ActionsConfigType, hostname: string): boolean {
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

function isWhitelistedHostnameInUri(config: ActionsConfigType, uri: string): boolean {
  return pipe(
    tryCatch(() => new URL(uri)),
    map(url => url.hostname),
    mapNullable(hostname => isWhitelisted(config, hostname)),
    getOrElse<boolean>(() => false)
  );
}

function isActionTypeEnabledinConfig(
  { enabledTypes }: ActionsConfigType,
  actionType: string
): boolean {
  const enabled = new Set(enabledTypes);
  if (enabled.has('*')) return true;
  if (enabled.has(actionType)) return true;
  return false;
}

export function getActionsConfigurationUtilities(
  config: ActionsConfigType
): ActionsConfigurationUtilities {
  const isWhitelistedHostname = curry(isWhitelisted)(config);
  const isWhitelistedUri = curry(isWhitelistedHostnameInUri)(config);
  const isActionTypeEnabled = curry(isActionTypeEnabledinConfig)(config);
  return {
    isWhitelistedHostname,
    isWhitelistedUri,
    isActionTypeEnabled,
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
    ensureActionTypeEnabled(actionType: string) {
      if (!isActionTypeEnabled(actionType)) {
        throw new Error(disabledActionTypeErrorMessage(actionType));
      }
    },
  };
}
