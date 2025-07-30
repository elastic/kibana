/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
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
    mockFindCaseUserActions.mockResolvedValue({
      userActions: [],
      page: 1,
      perPage: 1000,
      total: 0,
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
    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: mockCases,
        alertIds,
        isEnabled: false,
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockFindCaseUserActions).not.toHaveBeenCalled();
  });

  it('should not load when no alertIds are provided', () => {
    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: mockCases,
        alertIds: [],
        isEnabled: true,
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockFindCaseUserActions).not.toHaveBeenCalled();
  });

  it('should correctly identify cases with alert attachments', async () => {
    mockFindCaseUserActions
      .mockResolvedValueOnce({
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
        page: 1,
        perPage: 1000,
        total: 1,
      })
      .mockResolvedValueOnce({
        userActions: [],
        page: 1,
        perPage: 1000,
        total: 0,
      });

    const { result, waitFor } = renderHook(() =>
      useCheckAlertAttachments({
        cases: mockCases,
        alertIds,
        isEnabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAlertAttached('case-1')).toBe(true);
    expect(result.current.hasAlertAttached('case-2')).toBe(false);
    expect(result.current.casesWithAlertAttached).toHaveLength(1);
    expect(result.current.casesWithAlertAttached[0].id).toBe('case-1');
  });

  it('should handle array of alert IDs', async () => {
    mockFindCaseUserActions.mockResolvedValue({
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
      page: 1,
      perPage: 1000,
      total: 1,
    });

    const { result, waitFor } = renderHook(() =>
      useCheckAlertAttachments({
        cases: [mockCases[0]],
        alertIds,
        isEnabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAlertAttached('case-1')).toBe(true);
  });

  it('should handle non-alert attachments', async () => {
    mockFindCaseUserActions.mockResolvedValue({
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
      page: 1,
      perPage: 1000,
      total: 1,
    });

    const { result, waitFor } = renderHook(() =>
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
