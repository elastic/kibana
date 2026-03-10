/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import type { EntityManagerServerSetup } from '../../../types';
import { canManageEntityDefinition, entityDefinitionRuntimePrivileges } from '../privileges';
import { BUILT_IN_ALLOWED_INDICES } from '../../entities/built_in/constants';

export interface EntityDiscoveryAPIKey {
  id: string;
  name: string;
  apiKey: string;
}

export const checkIfAPIKeysAreEnabled = async (
  server: EntityManagerServerSetup
): Promise<boolean> => {
  return await server.security.authc.apiKeys.areAPIKeysEnabled();
};

export const checkIfEntityDiscoveryAPIKeyIsValid = async (
  server: EntityManagerServerSetup,
  apiKey: EntityDiscoveryAPIKey
): Promise<boolean> => {
  server.logger.debug('validating API key against authentication service');

  const isValid = await server.security.authc.apiKeys.validate({
    id: apiKey.id,
    api_key: apiKey.apiKey,
  });

  if (!isValid) return false;

  // this fake kibana request is how you get an API key-scoped client...
  // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
  //   Review and choose one of the following options:
  //   A) Still unsure? Leave this comment as-is.
  //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
  //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
  //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
  const esClient = server.core.elasticsearch.client.asScoped(
    getFakeKibanaRequest({
      id: apiKey.id,
      api_key: apiKey.apiKey,
    })
  , { projectRouting: 'origin-only' }).asCurrentUser;

  server.logger.debug('validating API key has runtime privileges for entity discovery');

  return canManageEntityDefinition(esClient, BUILT_IN_ALLOWED_INDICES);
};

export const generateEntityDiscoveryAPIKey = async (
  server: EntityManagerServerSetup,
  req: KibanaRequest
): Promise<EntityDiscoveryAPIKey | undefined> => {
  server.logger.info('Generating Entity Discovery API key');

  const apiKey = await server.security.authc.apiKeys.grantAsInternalUser(req, {
    name: 'Entity discovery API key',
    role_descriptors: {
      entity_discovery_admin: entityDefinitionRuntimePrivileges,
    },
    metadata: {
      description:
        'API key used to manage the transforms and ingest pipelines created by the entity discovery framework',
    },
  });

  if (apiKey !== null) {
    return {
      id: apiKey.id,
      name: apiKey.name,
      apiKey: apiKey.api_key,
    };
  }
};
