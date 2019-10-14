/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockGraphStore, MockedGraphEnvironment } from './mocks';
import { syncBreadcrumbSaga, updateMetaData } from './meta_data';
import { ChromeStart } from 'kibana/public';

describe('breadcrumb sync saga', () => {
  let env: MockedGraphEnvironment;

  beforeEach(() => {
    env = createMockGraphStore({
      sagas: [syncBreadcrumbSaga],
      mockedDepsOverwrites: {
        chrome: ({
          breadcrumbs: {
            set: jest.fn(),
          },
        } as unknown) as ChromeStart,
      },
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
