/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-server';
import { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { KibanaRequest } from '@kbn/core-http-server';

export async function getInternalSavedObjectsClient(coreStart: CoreStart) {
  return new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());
}

export function getInternalSavedObjectsClientForSpaceId(
  coreStart: CoreStart,
  spaceId?: string
): SavedObjectsClient {
  const request = kibanaRequestFactory({
    headers: {},
    path: '/',
    route: { settings: {} },
    url: { href: '', hash: '' } as URL,
    raw: { req: { url: '/' } } as any,
  });

  if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
    coreStart.http.basePath.set(request, `/s/${spaceId}`);
  }

  // soClient as kibana internal users, be careful on how you use it, security is not enabled
  return coreStart.savedObjects.getScopedClient(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
  }) as SavedObjectsClient;
}

export async function createInternalSavedObjectsClientForSpaceId(
  osqueryContext: { service: { getActiveSpace: Function }; getStartServices: Function },
  request: KibanaRequest
): Promise<SavedObjectsClient> {
  const space = await osqueryContext.service.getActiveSpace(request);
  const [core] = await osqueryContext.getStartServices();

  return getInternalSavedObjectsClientForSpaceId(core, space?.id ?? DEFAULT_SPACE_ID);
}
