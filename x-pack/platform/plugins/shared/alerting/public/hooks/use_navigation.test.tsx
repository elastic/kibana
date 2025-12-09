/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';

const mockNavigateTo = jest.fn();
const mockGetAppUrl = jest.fn();

jest.mock('../utils/kibana_react', () => {
  const originalModule = jest.requireActual('../utils/kibana_react');
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          application: { getUrlForApp: mockGetAppUrl, navigateToApp: mockNavigateTo },
        },
      };
    },
  };
});

let appMockRenderer: AppMockRenderer;

describe('useNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });
});
