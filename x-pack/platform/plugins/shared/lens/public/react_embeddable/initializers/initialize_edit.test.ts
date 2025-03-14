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

function createEditApi(servicesOverrides: Partial<LensEmbeddableStartServices> = {}) {
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
    { getAppContext: () => ({ currentAppId: 'lens' }), viewMode$: new BehaviorSubject('edit') }
  );
}

describe('edit features', () => {
  it('should be editable if visualize library privileges allow it', () => {
    const editApi = createEditApi();
    expect(editApi.api.isEditingEnabled()).toBe(true);
  });

  it('should not be editable if visualize library privileges do not allow it', () => {
    const editApi = createEditApi({
      capabilities: {
        visualize_v2: {
          // cannot save
          save: false,
          saveQuery: true,
          // cannot see the visualization
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
  });
});
