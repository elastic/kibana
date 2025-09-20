/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiamServicePublic } from './uiam_service';
import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../common/constants';

export const uiamServiceMock = {
  create: (): jest.Mocked<UiamServicePublic> => ({
    getAuthenticationHeaders: jest.fn().mockImplementation((accessToken: string) => ({
      authorization: `Bearer ${accessToken}`,
      [ES_CLIENT_AUTHENTICATION_HEADER]: 'some-shared-secret',
    })),
    getUserProfileGrant: jest.fn(),
    refreshSessionTokens: jest
      .fn()
      .mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
    invalidateSessionTokens: jest.fn().mockResolvedValue(undefined),
  }),
};
