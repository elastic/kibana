/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { MockAuthenticatedUserProps } from '@kbn/core-security-common/mocks';
import { securityServiceMock } from '@kbn/core-security-browser-mocks';
import { homeContextWrapper } from '../test_utils';
import { useAuthenticatedUser } from './use_authenticated_user';

const createUser = (overrides: MockAuthenticatedUserProps = {}) =>
  securityServiceMock.createMockAuthenticatedUser({
    username: 'jdoe',
    full_name: 'Jane Doe',
    email: 'jane@elastic.co',
    roles: [],
    ...overrides,
  });

describe('useAuthenticatedUser', () => {
  const security = securityServiceMock.createStart();
  const { getCurrentUser } = security.authc;

  const renderAuthenticatedUser = () =>
    renderHook(() => useAuthenticatedUser(), {
      wrapper: homeContextWrapper({ services: { security } }),
    }).result;

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue(createUser());
  });

  it('exposes the authenticated user once it resolves', async () => {
    const user = createUser();
    getCurrentUser.mockResolvedValue(user);

    const result = renderAuthenticatedUser();

    await waitFor(() => expect(result.current.user).toBe(user));
  });

  it('leaves the user undefined until the lookup resolves', async () => {
    const result = renderAuthenticatedUser();

    expect(result.current.user).toBeUndefined();

    await waitFor(() => expect(result.current.user).toBeDefined());
  });

  it('leaves the user undefined when the lookup fails', async () => {
    getCurrentUser.mockRejectedValue(new Error('not authenticated'));

    const result = renderAuthenticatedUser();

    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    expect(result.current.user).toBeUndefined();
  });
});
