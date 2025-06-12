/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { createEmptyLensState } from '../helper';
import { makeEmbeddableServices, getLensRuntimeStateMock } from '../mocks';
import { LensRuntimeState } from '../types';
import { initializeIntegrations } from './initialize_integrations';

function setupIntegrationsApi(stateOverrides?: Partial<LensRuntimeState>) {
  const services = makeEmbeddableServices(undefined, undefined, {
    visOverrides: { id: 'lnsXY' },
    dataOverrides: { id: 'formBased' },
  });
  const runtimeState = getLensRuntimeStateMock(stateOverrides);
  const { api } = initializeIntegrations(() => runtimeState, services);
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
      const { rawState, references } = api.serializeState();
      // make sure of 3 things:
      // * attributes are sent back
      expect(rawState).toEqual(expect.objectContaining({ attributes: expect.any(Object) }));
      // * savedObjectId is cleaned up
      expect(rawState).not.toHaveProperty('savedObjectId');
      // * references should be at root level
      expect(references).toEqual(attributes.references);
    });
    it('should remove all the attributes for a by-reference state panel', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({
        savedObjectId: '123',
        attributes,
      });
      const { rawState, references } = api.serializeState();
      // check the same 3 things as above
      expect(rawState).toEqual(
        expect.objectContaining({ attributes: undefined, savedObjectId: '123' })
      );
      // * references should be at root level
      expect(references).toEqual(attributes.references);
    });

    it('should remove the searchSessionId from the serializedState', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({
        attributes,
        searchSessionId: faker.string.uuid(),
      });
      const { rawState } = api.serializeState();
      expect('searchSessionId' in rawState).toBeFalsy();
    });
  });
});
