/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { initializeEditApi } from './initialize_edit';
import {
  getLensApiMock,
  getLensInternalApiMock,
  getLensRuntimeStateMock,
  makeEmbeddableServices,
} from '../mocks';
import { BehaviorSubject } from 'rxjs';
import { ApplicationStart } from '@kbn/core/public';
import { LensEmbeddableStartServices } from '../types';

function createEditApi(
  servicesOverrides: Partial<LensEmbeddableStartServices> = {},
  viewMode: 'edit' | 'view' = 'edit'
) {
  const internalApi = getLensInternalApiMock();
  const runtimeState = getLensRuntimeStateMock();
  const api = getLensApiMock();
  const services = {
    ...makeEmbeddableServices(new BehaviorSubject<string>(''), undefined, {
      visOverrides: { id: 'lnsXY' },
      dataOverrides: { id: 'formBased' },
    }),
    ...servicesOverrides,
  };
  return initializeEditApi(
    faker.string.uuid(),
    runtimeState,
    () => runtimeState,
    internalApi,
    api,
    api,
    api,
    () => false, // DSL based
    services,
    { getAppContext: () => ({ currentAppId: 'lens' }), viewMode$: new BehaviorSubject(viewMode) }
  );
}

describe('edit features', () => {
  describe('isEditingEnabled()', () => {
    it('should be editable if visualize library privileges allow it', () => {
      const editApi = createEditApi();
      expect(editApi.api.isEditingEnabled()).toBe(true);
      expect(editApi.api.isReadOnlyEnabled()).toBe(false);
    });

    it('should not be editable if visualize library privileges do not allow it', () => {
      const editApi = createEditApi({
        capabilities: {
          visualize: {
            // cannot save
            save: false,
            saveQuery: true,
            // can see the visualization
            show: true,
            createShortUrl: true,
          },
          dashboard: {
            // cannot edit in dashboard
            showWriteControls: false,
          },
        } as unknown as ApplicationStart['capabilities'],
      });

      expect(editApi.api.isEditingEnabled()).toBe(false);
      expect(editApi.api.isReadOnlyEnabled()).toBe(false);
    });
  });

  describe('isReadOnlyEnabled()', () => {
    it('should should be read only enabled if edit capabilities are off', () => {
      const editApi = createEditApi(
        {
          capabilities: {
            visualize: {
              // cannot save
              save: false,
              saveQuery: true,
              // can see the visualization
              show: true,
              createShortUrl: true,
            },
            dashboard: {
              // cannot edit in dashboard
              showWriteControls: false,
            },
          } as unknown as ApplicationStart['capabilities'],
        },
        'view'
      );
      expect(editApi.api.isReadOnlyEnabled()).toBe(true);
      expect(editApi.api.isEditingEnabled()).toBe(false);
    });

    it('should should be read only disabled if show capabilities are off', () => {
      const editApi = createEditApi(
        {
          capabilities: {
            visualize: {
              // cannot save
              save: false,
              saveQuery: true,
              // cannot see the visualization
              show: false,
              createShortUrl: true,
            },
            dashboard: {
              // cannot edit in dashboard
              showWriteControls: false,
            },
          } as unknown as ApplicationStart['capabilities'],
        },
        'view'
      );
      expect(editApi.api.isReadOnlyEnabled()).toBe(false);
      expect(editApi.api.isEditingEnabled()).toBe(false);
    });
  });
});
