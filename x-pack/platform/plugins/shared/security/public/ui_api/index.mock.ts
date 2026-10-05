/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUiApi } from '.';
import type { UiApi } from '.';

export const getUiApiMock = {
  /** Creates spies backed by real UI components for consumer integration tests. */
  createWithComponents: (options: Parameters<typeof getUiApi>[0]) => {
    const { components } = getUiApi(options);
    return {
      components: {
        getServiceAccountPicker: jest.fn(components.getServiceAccountPicker),
        getCreateServiceAccount: jest.fn(components.getCreateServiceAccount),
        getPersonalInfo: jest.fn(components.getPersonalInfo),
        getChangePassword: jest.fn(components.getChangePassword),
      },
    };
  },
  createStart: (): jest.Mocked<UiApi> => ({
    components: {
      getServiceAccountPicker: jest.fn(),
      getCreateServiceAccount: jest.fn(),
      getPersonalInfo: jest.fn(),
      getChangePassword: jest.fn(),
    },
  }),
};
