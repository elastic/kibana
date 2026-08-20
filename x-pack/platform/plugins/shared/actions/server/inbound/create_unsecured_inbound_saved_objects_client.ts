/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { asSpaceId } from '@kbn/core-spaces-common';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { CoreSetup, SavedObjectsClientContract } from '@kbn/core/server';

import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

/**
 * Builds a space-scoped Saved Objects client without security extensions for
 * connector-token ingress (no Kibana user session).
 */
export async function createUnsecuredInboundSavedObjectsClient({
  getStartServices,
  spaceId,
}: {
  getStartServices: CoreSetup['getStartServices'];
  spaceId: string;
}): Promise<SavedObjectsClientContract> {
  const [coreStart] = await getStartServices();
  const internalRequest = kibanaRequestFactory({
    headers: {},
    spaceId: asSpaceId(spaceId),
  });
  return coreStart.savedObjects.getScopedClient(internalRequest, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
    includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
  });
}
