/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserNameDisplay } from './user_name_display';
import { useBulkGetUserProfiles } from '../hooks/use_bulk_get_user_profiles';

jest.mock('../hooks/use_bulk_get_user_profiles');

const mockUseBulkGetUserProfiles = useBulkGetUserProfiles as jest.Mock;

describe('UserNameDisplay', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display loading spinner when fetching user profiles', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      isLoading: true,
      data: undefined,
    });

    render(<UserNameDisplay userId="user-id-1" data-test-subj="user-display" />, { wrapper });

    expect(screen.getByTestId('user-display')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display full name when user profile is loaded', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      isLoading: false,
      data: [
        {
          uid: 'user-id-1',
          user: {
            username: 'testuser',
            full_name: 'Test User',
          },
        },
      ],
    });

    render(<UserNameDisplay userId="user-id-1" data-test-subj="user-display" />, { wrapper });

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should display username when full name is not available', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      isLoading: false,
      data: [
        {
          uid: 'user-id-1',
          user: {
            username: 'testuser',
            full_name: null,
          },
        },
      ],
    });

    render(<UserNameDisplay userId="user-id-1" data-test-subj="user-display" />, { wrapper });

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should display raw user ID when no user profiles are available', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      isLoading: false,
      data: [],
    });

    render(<UserNameDisplay userId="user-id-1" data-test-subj="user-display" />, { wrapper });

    expect(screen.getByText('user-id-1')).toBeInTheDocument();
  });

  it('should display raw user ID when user profiles data is undefined', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      isLoading: false,
      data: undefined,
    });

    render(<UserNameDisplay userId="user-id-1" data-test-subj="user-display" />, { wrapper });

    expect(screen.getByText('user-id-1')).toBeInTheDocument();
  });

  it('should pass userId to useBulkGetUserProfiles hook', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      isLoading: false,
      data: [],
    });

    render(<UserNameDisplay userId="test-user-123" />, { wrapper });

    expect(mockUseBulkGetUserProfiles).toHaveBeenCalledWith({
      uids: new Set(['test-user-123']),
    });
  });

  it('should memoize userIds to prevent unnecessary re-renders', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      isLoading: false,
      data: [],
    });

    const { rerender } = render(<UserNameDisplay userId="user-id-1" />, { wrapper });

    const firstCallArgs = mockUseBulkGetUserProfiles.mock.calls[0][0];

    rerender(<UserNameDisplay userId="user-id-1" />);

    const secondCallArgs = mockUseBulkGetUserProfiles.mock.calls[1][0];

    // The Set should be the same instance due to useMemo
    expect(firstCallArgs.uids).toEqual(secondCallArgs.uids);
  });
});
