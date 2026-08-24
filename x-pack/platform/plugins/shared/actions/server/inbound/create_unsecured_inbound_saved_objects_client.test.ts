/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';

import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import { createUnsecuredInboundSavedObjectsClient } from './create_unsecured_inbound_saved_objects_client';

describe('createUnsecuredInboundSavedObjectsClient', () => {
  it('returns a scoped client without security extensions for the action type', async () => {
    const coreStart = coreMock.createStart();
    const scopedClient = {};
    coreStart.savedObjects.getScopedClient.mockReturnValue(scopedClient as never);
    const getStartServices = jest.fn().mockResolvedValue([coreStart, {}, {}]);

    const client = await createUnsecuredInboundSavedObjectsClient({
      getStartServices,
      spaceId: 'space-a',
    });

    expect(client).toBe(scopedClient);
    expect(getStartServices).toHaveBeenCalledTimes(1);
    expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(expect.any(Object), {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
    });
  });
});
