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
import { PublishesViewMode, ViewMode } from '@kbn/presentation-publishing';

function createEditApi(
  servicesOverrides: Partial<LensEmbeddableStartServices> = {},
  parentApiOverrides: Partial<PublishesViewMode | { isManaged: boolean }> = {}
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
  const parentApi = {
    getAppContext: () => ({ currentAppId: 'lens' }),
    viewMode$: new BehaviorSubject('edit'),
    ...parentApiOverrides,
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
    parentApi
  );
}

describe('edit features', () => {
  describe('isEditingEnabled()', () => {
    it('should be editable if visualize library privileges allow it', () => {
      const editApi = createEditApi();
      expect(editApi.api.isEditingEnabled()).toBe(true);
      // { read: false } here is expected the environment is in edit mode
      expect(editApi.api.isReadOnlyEnabled()).toEqual({ read: false, write: true });
    });

    it('should not be editable if visualize library privileges do not allow it', () => {
      const editApi = createEditApi({
        capabilities: {
          visualize_v2: {
            // cannot save
            save: false,
            saveQuery: true,
            // can see the visualization
            show: true,
            createShortUrl: true,
          },
          dashboard_v2: {
            // cannot edit in dashboard
            showWriteControls: false,
          },
        } as unknown as ApplicationStart['capabilities'],
      });

      expect(editApi.api.isEditingEnabled()).toBe(false);
      // { read: false } here is expected the environment is in edit mode
      expect(editApi.api.isReadOnlyEnabled()).toEqual({ read: false, write: false });
    });

    it("should return false if it's a managed context", () => {
      const editApi = createEditApi(undefined, {
        isManaged: true,
      });
      expect(editApi.api.isEditingEnabled()).toBe(false);
      // { read: false } here is expected the environment is in edit mode
      expect(editApi.api.isReadOnlyEnabled()).toEqual({ read: false, write: false });
    });
  });

  describe('isReadOnlyEnabled()', () => {
    it('should be read only enabled if user has edit permissions', () => {
      const editApi = createEditApi(undefined, {
        viewMode$: new BehaviorSubject('view' as ViewMode),
      });
      expect(editApi.api.isEditingEnabled()).toBe(false);
      // now it's in view mode, read should be true and write should be true too
      expect(editApi.api.isReadOnlyEnabled()).toEqual({ read: true, write: true });
    });

    it('should be read only enabled if edit capabilities are off', () => {
      const editApi = createEditApi(
        {
          capabilities: {
            visualize_v2: {
              // cannot save
              save: false,
              saveQuery: true,
              // can see the visualization
              show: true,
              createShortUrl: true,
            },
            dashboard_v2: {
              // cannot edit in dashboard
              showWriteControls: false,
            },
          } as unknown as ApplicationStart['capabilities'],
        },
        {
          viewMode$: new BehaviorSubject('view' as ViewMode),
        }
      );
      expect(editApi.api.isReadOnlyEnabled()).toEqual({ read: true, write: false });
      expect(editApi.api.isEditingEnabled()).toBe(false);
    });

    it('should be read only disabled if show capabilities are off', () => {
      const editApi = createEditApi(
        {
          capabilities: {
            visualize_v2: {
              // cannot save
              save: false,
              saveQuery: true,
              // cannot see the visualization
              show: false,
              createShortUrl: true,
            },
            dashboard_v2: {
              // cannot edit in dashboard
              showWriteControls: false,
            },
          } as unknown as ApplicationStart['capabilities'],
        },
        {
          viewMode$: new BehaviorSubject('view' as ViewMode),
        }
      );
      expect(editApi.api.isReadOnlyEnabled()).toEqual({ read: false, write: false });
      expect(editApi.api.isEditingEnabled()).toBe(false);
    });

    it('should be read only enabled but with no write flag is dashboard write is disabled', () => {
      const editApi = createEditApi(
        {
          capabilities: {
            visualize_v2: {
              // can save a visualization but not edit in dashboard (see below)
              save: true,
              saveQuery: true,
              // can see the visualization
              show: true,
              createShortUrl: true,
            },
            dashboard_v2: {
              // cannot edit in dashboard
              showWriteControls: false,
            },
          } as unknown as ApplicationStart['capabilities'],
        },
        {
          viewMode$: new BehaviorSubject('view' as ViewMode),
        }
      );
      expect(editApi.api.isReadOnlyEnabled()).toEqual({ read: true, write: false });
      expect(editApi.api.isEditingEnabled()).toBe(false);
    });

    it('should enable read only mode on a managed context even if user has write permissions', () => {
      const editApi = createEditApi(
        {
          capabilities: {
            visualize_v2: {
              // can save a visualization but not edit in dashboard (see below)
              save: true,
              saveQuery: true,
              // can see the visualization
              show: true,
              createShortUrl: true,
            },
            dashboard_v2: {
              // can edit in dashboard
              showWriteControls: true,
            },
          } as unknown as ApplicationStart['capabilities'],
        },
        {
          viewMode$: new BehaviorSubject('view' as ViewMode),
          isManaged: true,
        }
      );
      expect(editApi.api.isReadOnlyEnabled()).toEqual({ read: true, write: false });
      expect(editApi.api.isEditingEnabled()).toBe(false);
    });
  });
});
