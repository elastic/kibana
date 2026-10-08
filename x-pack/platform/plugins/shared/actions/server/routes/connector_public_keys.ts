/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { connectorTypePublishesKeys } from '@kbn/connector-specs';
import { CONNECTOR_PUBLIC_KEYS_API_PATH, SSF_DISCOVERY_PATH_PREFIX } from '../../common';
import {
  ACTION_SAVED_OBJECT_TYPE,
  CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';
import { createUnsecuredInboundSavedObjectsClient } from '../inbound/create_unsecured_inbound_saved_objects_client';
import { getConnectorPublicKey } from '../lib/connector_signing_keys';
import type { RawAction } from '../types';
import type { RouteOptions } from '.';

export const connectorPublicKeysRoutes = ({
  router,
  core,
  getSpaceId,
}: Pick<RouteOptions, 'router' | 'core' | 'getSpaceId'>): void => {
  const routes = [
    { path: `${CONNECTOR_PUBLIC_KEYS_API_PATH}/jwks.json`, discovery: false },
    { path: `${SSF_DISCOVERY_PATH_PREFIX}${CONNECTOR_PUBLIC_KEYS_API_PATH}`, discovery: true },
    {
      path: `${SSF_DISCOVERY_PATH_PREFIX}/s/{space_id}${CONNECTOR_PUBLIC_KEYS_API_PATH}`,
      discovery: true,
    },
  ];
  for (const { path, discovery } of routes) {
    router.get(
      {
        path,
        security: {
          authc: {
            enabled: false,
            reason:
              'Receivers fetch public signature verification keys and transmitter metadata without a Kibana login.',
          },
          authz: {
            enabled: false,
            reason:
              'Only the public part of a server-generated key is returned for the requested connector and space.',
          },
        },
        options: { access: 'public' },
        validate: {
          params: schema.object({
            connector_type_id: schema.string({ minLength: 1, maxLength: 128 }),
            connector_id: schema.string({ minLength: 1, maxLength: 128 }),
            space_id: schema.maybe(schema.string({ minLength: 1, maxLength: 128 })),
          }),
        },
      },
      router.handleLegacyErrors(async (_context, request, response) => {
        const {
          connector_type_id: connectorTypeId,
          connector_id: connectorId,
          space_id: explicitSpaceId,
        } = request.params;
        if (!connectorTypePublishesKeys(connectorTypeId)) return response.notFound();
        const spaceId = explicitSpaceId ?? getSpaceId?.(request) ?? 'default';
        const client = await createUnsecuredInboundSavedObjectsClient({
          getStartServices: core.getStartServices,
          spaceId,
          includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE, CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE],
        });
        try {
          const { attributes } = await client.get<RawAction>(ACTION_SAVED_OBJECT_TYPE, connectorId);
          if (attributes.actionTypeId !== connectorTypeId) return response.notFound();
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) return response.notFound();
          throw error;
        }
        const key = await getConnectorPublicKey({
          savedObjectsClient: client,
          connectorId,
          spaceId,
        });
        if (!key) return response.notFound();
        const { issuer, publicKey } = key;
        return response.ok({
          body: discovery
            ? {
                spec_version: '1_0',
                issuer,
                jwks_uri: `${issuer}/jwks.json`,
                delivery_methods_supported: ['urn:ietf:rfc:8935'],
              }
            : { keys: [publicKey] },
          headers: { 'Cache-Control': 'public, max-age=60' },
        });
      })
    );
  }
};
