/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { AuthMode } from '@kbn/connector-specs';
import type { GetUserTokenConnectorsSoResult } from '../../../data/connector/types';
import type { RawAction } from '../../../types';
import type { Connector } from '../types';
import { getAuthMode } from './get_auth_mode';

function getCurrentUserConnectionStatus(
  connectorId: string,
  userTokenConnectors: GetUserTokenConnectorsSoResult,
  authMode: AuthMode | undefined
): 'connected' | 'not_connected' | 'not_applicable' {
  if (authMode === undefined || authMode === 'shared') {
    return 'not_applicable';
  }
  if (userTokenConnectors.connectorIds.includes(connectorId)) {
    return 'connected';
  }
  return 'not_connected';
}

export function connectorFromSavedObject(
  savedObject: SavedObject<RawAction>,
  isDeprecated: boolean,
  isConnectorTypeDeprecated: boolean,
  authorizationCodeEnabled: boolean,
  userTokenConnectors: GetUserTokenConnectorsSoResult
): Connector {
  const { authMode: savedAuthMode, ...restAttributes } = savedObject.attributes;
  const authMode = getAuthMode(
    savedAuthMode as Connector['authMode'] | undefined,
    authorizationCodeEnabled
  );
  return {
    id: savedObject.id,
    ...restAttributes,
    isPreconfigured: false,
    isDeprecated,
    isSystemAction: false,
    isConnectorTypeDeprecated,
    currentUserConnectionStatus: getCurrentUserConnectionStatus(
      savedObject.id,
      userTokenConnectors,
      authMode
    ),
    ...(authMode !== undefined ? { authMode } : {}),
  };
}
