/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { RawAction } from '../../../types';
import type { Connector } from '../types';
import { getAuthMode } from './get_auth_mode';

export function connectorFromSavedObject(
  savedObject: SavedObject<RawAction>,
  isDeprecated: boolean,
  isConnectorTypeDeprecated: boolean
): Connector {
  const { authMode: savedAuthMode, ...restAttributes } = savedObject.attributes;
  const authMode = getAuthMode(savedAuthMode as Connector['authMode'] | undefined);
  return {
    id: savedObject.id,
    ...restAttributes,
    isPreconfigured: false,
    isDeprecated,
    isSystemAction: false,
    isConnectorTypeDeprecated,
    authMode,
  };
}
