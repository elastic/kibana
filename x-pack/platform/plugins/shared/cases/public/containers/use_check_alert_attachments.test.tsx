/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCheckAlertAttachments } from './use_check_alert_attachments';
import { findCaseUserActions } from './api';
import { AttachmentType } from '../../common/types/domain';

// Mock the API
jest.mock('./api');
const mockFindCaseUserActions = findCaseUserActions as jest.MockedFunction<typeof findCaseUserActions>;

// Mock the toast
jest.mock('../common/use_cases_toast', () => ({
  useCasesToast: () => ({
    showErrorToast: jest.fn(),
  }),
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

describe('useCheckAlertAttachments', () => {
  const mockCases = [
    {
      id: 'case-1',
      title: 'Test Case 1',
      status: 'open',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      version: '1',
      owner: 'securitySolution',
      assignees: [],
      tags: [],
      category: null,
      description: 'Test case 1',
      severity: 'low',
      totalAlerts: 0,
      totalComment: 0,
      customFields: [],
      externalService: null,
    },
    {
      id: 'case-2',
      title: 'Test Case 2',
      status: 'open',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      version: '1',
      owner: 'securitySolution',
      assignees: [],
      tags: [],
      category: null,
      description: 'Test case 2',
      severity: 'low',
      totalAlerts: 0,
      totalComment: 0,
      customFields: [],
      externalService: null,
    },
  ];

  const alertIds = ['alert-1', 'alert-2'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state when enabled and alertIds are provided', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: mockCases,
        alertIds,
        isEnabled: true,
      })
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should not load when disabled', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: undefined,
    });

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: mockCases,
        alertIds,
        isEnabled: false,
      })
    );

    expect(result.current.isLoading).toBe(false);
  });

  it('should not load when no alertIds are provided', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: undefined,
    });

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: mockCases,
        alertIds: [],
        isEnabled: true,
      })
    );

    expect(result.current.isLoading).toBe(false);
  });

  it('should correctly identify cases with alert attachments', async () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery
      .mockReturnValueOnce({
        isLoading: false,
        isError: false,
        data: {
          userActions: [
            {
              type: 'comment',
              payload: {
                comment: {
                  type: AttachmentType.alert,
                  alertId: 'alert-1',
                },
              },
            },
          ],
        },
      })
      .mockReturnValueOnce({
        isLoading: false,
        isError: false,
        data: {
          userActions: [],
        },
      });

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: mockCases,
        alertIds: ['alert-1'],
        isEnabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAlertAttached('case-1')).toBe(true);
    expect(result.current.hasAlertAttached('case-2')).toBe(false);
  });

  it('should return false when only some alerts are attached', async () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        userActions: [
          {
            type: 'comment',
            payload: {
              comment: {
                type: AttachmentType.alert,
                alertId: 'alert-1',
              },
            },
          },
        ],
      },
    });

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: [mockCases[0]],
        alertIds: ['alert-1', 'alert-2'],
        isEnabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAlertAttached('case-1')).toBe(false);
  });

  it('should return true when all alerts are attached', async () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        userActions: [
          {
            type: 'comment',
            payload: {
              comment: {
                type: AttachmentType.alert,
                alertId: ['alert-1', 'alert-2'],
              },
            },
          },
        ],
      },
    });

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: [mockCases[0]],
        alertIds: ['alert-1', 'alert-2'],
        isEnabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAlertAttached('case-1')).toBe(true);
  });

  it('should handle array of alert IDs', async () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        userActions: [
          {
            type: 'comment',
            payload: {
              comment: {
                type: AttachmentType.alert,
                alertId: ['alert-1', 'alert-3'],
              },
            },
          },
        ],
      },
    });

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: [mockCases[0]],
        alertIds: ['alert-1', 'alert-3'],
        isEnabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAlertAttached('case-1')).toBe(true);
  });

  it('should handle non-alert attachments', async () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        userActions: [
          {
            type: 'comment',
            payload: {
              comment: {
                type: AttachmentType.user,
                comment: 'Test comment',
              },
            },
          },
        ],
      },
    });

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: [mockCases[0]],
        alertIds,
        isEnabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAlertAttached('case-1')).toBe(false);
  });
});
