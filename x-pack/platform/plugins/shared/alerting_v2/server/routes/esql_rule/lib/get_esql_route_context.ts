/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { ESQL_RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';

const INTERNAL_BASE_ALERTING_API_PATH = '/internal/alerting';

export const INTERNAL_ESQL_RULE_API_PATH = `${INTERNAL_BASE_ALERTING_API_PATH}/esql_rule`;

export function getSpaceIdFromRequest(coreStart: CoreStart, request: KibanaRequest) {
  const requestBasePath = coreStart.http.basePath.get(request);
  const space = getSpaceIdFromPath(requestBasePath, coreStart.http.basePath.serverBasePath);
  return space?.spaceId || 'default';
}

export function getEsqlRuleRouteContext({
  coreStart,
  pluginsStart,
  request,
  logger,
}: {
  coreStart: CoreStart;
  pluginsStart: {
    spaces: SpacesPluginStart;
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
    security?: SecurityPluginStart;
  };
  request: KibanaRequest;
  logger: Logger;
}) {
  const spaceId = getSpaceIdFromRequest(coreStart, request);
  const namespace = pluginsStart.spaces.spacesService.spaceIdToNamespace(spaceId);

  const savedObjectsClient = coreStart.savedObjects.getScopedClient(request, {
    includedHiddenTypes: [ESQL_RULE_SAVED_OBJECT_TYPE],
  });
  const encryptedSavedObjectsClient = pluginsStart.encryptedSavedObjects.getClient({
    includedHiddenTypes: [ESQL_RULE_SAVED_OBJECT_TYPE],
  });

  const security = pluginsStart.security;
  const getUserName = async () => security?.authc.getCurrentUser(request)?.username ?? null;

  logger.debug(`alerting_v2 esql_rule route context: spaceId=${spaceId} namespace=${namespace}`);

  return {
    spaceId,
    namespace,
    savedObjectsClient,
    encryptedSavedObjectsClient,
    security,
    getUserName,
  };
}
