/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { ActionTypeRegistry } from '../../../action_type_registry';
import type { RawAction } from '../../../types';
import type { Connector } from '../types';
import { getAuthMode } from './get_auth_mode';

export function connectorFromSavedObject(
  savedObject: SavedObject<RawAction>,
  isDeprecated: boolean,
  isConnectorTypeDeprecated: boolean,
  actionTypeRegistry?: ActionTypeRegistry
): Connector {
  const { authMode: savedAuthMode, secrets: _secrets, ...restAttributes } = savedObject.attributes;
  const authMode = getAuthMode(savedAuthMode as Connector['authMode'] | undefined);
  const activeSpecVersion = restAttributes.specId
    ? actionTypeRegistry?.tryResolveActionType(restAttributes.specId)?.connectorSpec?.version
    : undefined;
  return {
    id: savedObject.id,
    ...restAttributes,
    actionTypeId: restAttributes.specId ?? restAttributes.actionTypeId,
    isPreconfigured: false,
    isDeprecated,
    isSystemAction: false,
    isConnectorTypeDeprecated,
    authMode,
    ...(activeSpecVersion ? { activeSpecVersion } : {}),
  };
}
