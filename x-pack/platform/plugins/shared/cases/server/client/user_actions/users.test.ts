/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUserActionServiceMock } from '../../services/mocks';
import { createMockClient } from '../metrics/test_utils/client';
import { createCasesClientMockArgs } from '../mocks';
import { getUsers } from './users';
import { mockCases } from '../../mocks';
import type { CaseResolveResponse } from '../../../common/types/api';
import { getUserProfiles } from '../cases/utils';

jest.mock('../cases/utils');

const getUserProfilesMock = getUserProfiles as jest.Mock;

describe('getUsers', () => {
  const casesClient = createMockClient();

  casesClient.cases.resolve.mockResolvedValue({
    case: mockCases[0].attributes,
  } as CaseResolveResponse);

  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();

  userActionService.getUsers.mockResolvedValue({
    participants: [
      {
        id: 'foo',
        owner: 'bar',
        user: { email: '', full_name: '', username: '', profile_uid: '' },
      },
      {
        id: 'foo',
        owner: 'bar',
        user: { email: '', full_name: '', username: '', profile_uid: 'some_profile_id' },
      },
    ],
    assignedAndUnassignedUsers: new Set([]),
  });
  getUserProfilesMock.mockResolvedValue(new Map());
  clientArgs.services.userActionService = userActionService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes empty uids from getUserProfiles call', async () => {
    await getUsers({ caseId: 'test-case' }, casesClient, clientArgs);

    expect(getUserProfilesMock).toHaveBeenCalledWith(
      expect.any(Object),
      new Set(['some_profile_id']),
      expect.any(String)
    );
  });
});
