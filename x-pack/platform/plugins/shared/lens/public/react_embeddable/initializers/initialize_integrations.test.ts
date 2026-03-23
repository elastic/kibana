/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';

import type { LensRuntimeState } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';

import { createEmptyLensState } from '../helper';
import { getLensRuntimeStateMock } from '../mocks';
import { initializeIntegrations } from './initialize_integrations';

function setupIntegrationsApi(stateOverrides?: Partial<LensRuntimeState>): LensApi {
  const runtimeState = getLensRuntimeStateMock(stateOverrides);
  const { api } = initializeIntegrations(() => runtimeState);
  return api as LensApi;
}

function createAttributesWithReferences() {
  const attributes = createEmptyLensState().attributes;
  attributes.references = [{ type: 'index-pattern', id: '1', name: 'indexpattern-datasource' }];
  return attributes;
}

describe('Dashboard services API', () => {
  describe('serializeState', () => {
    it('should work for a by-value panel', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({ attributes });
      const serializedState = api.serializeState();
      expect(serializedState).toEqual(expect.objectContaining({ attributes: expect.any(Object) }));
      expect(serializedState.savedObjectId).toBeUndefined();
    });

    it('should serialize state for a by-reference panel', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({
        savedObjectId: '123',
        attributes,
      });
      const serializedState = api.serializeState();
      expect(serializedState).not.toEqual(
        expect.objectContaining({ attributes: expect.anything() })
      );
    });

    it('should remove the searchSessionId from the serializedState', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({
        attributes,
        searchSessionId: faker.string.uuid(),
      });
      const serializedState = api.serializeState();
      expect('searchSessionId' in serializedState).toBeFalsy();
    });
  });
});
