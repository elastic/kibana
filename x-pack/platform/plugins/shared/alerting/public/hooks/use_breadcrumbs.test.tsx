/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';

const mockSetBreadcrumbs = jest.fn();
const mockSetTitle = jest.fn();

jest.mock('../utils/kibana_react', () => {
  const originalModule = jest.requireActual('../utils/kibana_react');
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          chrome: { setBreadcrumbs: mockSetBreadcrumbs, docTitle: { change: mockSetTitle } },
        },
      };
    },
  };
});

jest.mock('./use_navigation', () => {
  const originalModule = jest.requireActual('./use_navigation');
  return {
    ...originalModule,
    useNavigation: jest.fn().mockReturnValue({
      getAppUrl: jest.fn((params?: { deepLinkId: string }) => params?.deepLinkId ?? '/test'),
    }),
  };
});

let appMockRenderer: AppMockRenderer;

describe('useBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });
});
