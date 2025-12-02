/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { createEmptyLensState } from '../helper';
import { getLensRuntimeStateMock } from '../mocks';
import type { LensRuntimeState } from '@kbn/lens-common';
import { initializeIntegrations } from './initialize_integrations';

function setupIntegrationsApi(stateOverrides?: Partial<LensRuntimeState>) {
  const runtimeState = getLensRuntimeStateMock(stateOverrides);
  const { api } = initializeIntegrations(() => runtimeState);
  return api;
}

function createAttributesWithReferences() {
  const attributes = createEmptyLensState().attributes;
  // inject some references to test later
  attributes.references = [{ type: 'index-pattern', id: '1', name: 'indexpattern-datasource' }];
  return attributes;
}

describe('Dashboard services API', () => {
  describe('serializeState', () => {
    it('should work for a by-value panel', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({ attributes });
      const state = api.serializeState();
      // make sure of 3 things:
      // * attributes are sent back
      expect(state).toEqual(expect.objectContaining({ attributes: expect.any(Object) }));
      // * savedObjectId is cleaned up
      expect(state).not.toHaveProperty('savedObjectId');
    });
    it('should serialize state for a by-reference panel', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({
        savedObjectId: '123',
        attributes,
      });
      const state = api.serializeState();
      // check the same 3 things as above
      expect(state).not.toEqual(expect.objectContaining({ attributes: expect.anything() }));
    });

    it('should remove the searchSessionId from the serializedState', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({
        attributes,
        searchSessionId: faker.string.uuid(),
      });
      const state = api.serializeState();
      expect('searchSessionId' in state).toBeFalsy();
    });
  });
});
