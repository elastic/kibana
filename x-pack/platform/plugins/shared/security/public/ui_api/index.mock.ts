/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiApi } from '.';

export const getUiApiMock = {
  createStart: (): jest.Mocked<UiApi> => ({
    components: {
      getPersonalInfo: jest.fn(),
      getChangePassword: jest.fn(),
    },
  }),
};
