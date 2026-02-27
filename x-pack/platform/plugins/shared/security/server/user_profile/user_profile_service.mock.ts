/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileServiceStartInternal } from '.';
import { userProfileMock } from '../../common/model/user_profile.mock';

export const userProfileServiceMock = {
  createStart: (): jest.Mocked<UserProfileServiceStartInternal> => ({
    activate: jest.fn().mockReturnValue(userProfileMock.createWithSecurity()),
    getCurrent: jest.fn(),
    update: jest.fn(),
    suggest: jest.fn(),
    bulkGet: jest.fn(),
  }),
};
