/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensRuntimeState } from '../types';
import { getLensRuntimeStateMock, getLensInternalApiMock, makeEmbeddableServices } from '../mocks';
import { initializeSearchContext } from './initialize_search_context';

function setupSearchContextApi(runtimeOverrides?: Partial<LensRuntimeState>) {
  const runtimeState = getLensRuntimeStateMock(runtimeOverrides);
  const internalApiMock = getLensInternalApiMock();
  const services = makeEmbeddableServices();
  const { api, cleanup } = initializeSearchContext(runtimeState, internalApiMock, {}, services);
  return { api, cleanup, internalApi: internalApiMock };
}

describe('Context API', () => {
  it('should update the context query and filters when the corresponding attributes change', async () => {
    const { api, cleanup, internalApi } = setupSearchContextApi();
    internalApi.updateAttributes({
      ...internalApi.attributes$.getValue(),
      state: {
        ...internalApi.attributes$.getValue().state,
        query: { esql: 'FROM kibana_sample_data_logs | LIMIT 1' },
        filters: [{ meta: { alias: 'test', disabled: false, negate: false, index: 'test' } }],
      },
    });
    expect(api.query$.getValue()).toEqual(internalApi.attributes$.getValue().state.query);
    expect(api.filters$.getValue()).toEqual(internalApi.attributes$.getValue().state.filters);

    cleanup();
  });
});
