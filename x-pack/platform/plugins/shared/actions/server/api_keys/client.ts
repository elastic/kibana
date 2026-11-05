/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { ApiKeysClient } from '@kbn/response-ops-api-keys';
import { CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA } from '../inbound/event_identity/types';

export const ACTIONS_PLUGIN_TAG = 'actions';

export const getConnectorEventIdentitySubject = (name: string): string =>
  `connector event identity "${name}"`;

/** A connector event identity is always Kibana-owned: the caller's own key is cloned, never reused. */
export const createActionsApiKeysClient = (
  security: SecurityServiceStart,
  logger: Logger
): ApiKeysClient =>
  new ApiKeysClient({
    security,
    logger,
    profile: {
      pluginTag: ACTIONS_PLUGIN_TAG,
      uiam: 'optional',
      reuse: false,
      metadata: CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
    },
  });
