/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedGraphEnvironment } from './mocks';
import { createMockGraphStore } from './mocks';
import { registerMetaDataListeners, updateMetaData } from './meta_data';

describe('breadcrumb sync listener', () => {
  let env: MockedGraphEnvironment;

  beforeEach(() => {
    env = createMockGraphStore({
      listeners: [registerMetaDataListeners],
    });
  });

  it('syncs breadcrumb initially', () => {
    expect(env.mockedDeps.chrome.setBreadcrumbs).toHaveBeenCalled();
  });

  it('syncs breadcrumb with each change to meta data', () => {
    env.store.dispatch(updateMetaData({}));
    expect(env.mockedDeps.chrome.setBreadcrumbs).toHaveBeenCalledTimes(2);
  });
});
