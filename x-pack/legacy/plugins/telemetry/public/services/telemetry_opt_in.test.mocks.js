/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { injectedMetadataServiceMock } from '../../../../../../src/core/public/mocks';
const injectedMetadataMock = injectedMetadataServiceMock.createStartContract();

export function mockInjectedMetadata({ telemetryOptedIn }) {
  const mockGetInjectedVar = jest.fn().mockImplementation((key) => {
    switch (key) {
      case 'telemetryOptedIn': return telemetryOptedIn;
      default: throw new Error(`unexpected injectedVar ${key}`);
    }
  });

  injectedMetadataMock.getInjectedVar = mockGetInjectedVar;
}

jest.doMock('ui/new_platform', () => ({
  npStart: {
    core: {
      injectedMetadata: injectedMetadataMock
    },
  },
}));
