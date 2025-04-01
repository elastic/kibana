/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useAnonymizationUpdater } from './use_anonymization_updater'; // Adjust the import path
import { bulkUpdateAnonymizationFields } from '../../api/anonymization_fields/bulk_update_anonymization_fields';
import { HttpSetup } from '@kbn/core-http-browser';
import { IToasts } from '@kbn/core-notifications-browser';
import { BatchUpdateListItem } from '../../../data_anonymization_editor/context_editor/types';

jest.mock('../../api/anonymization_fields/bulk_update_anonymization_fields', () => ({
  bulkUpdateAnonymizationFields: jest.fn(),
}));
const mockField = {
  timestamp: '2025-02-04T16:47:17.791Z',
  createdAt: '2025-02-04T16:47:17.791Z',
  field: 'user.name',
  allowed: true,
  anonymized: false,
  updatedAt: '2025-02-20T16:56:58.086Z',
  namespace: 'default',
  id: 'blnb0ZQBQBIRhhJM6eMi',
};
const mockField2 = {
  timestamp: '2025-02-04T16:47:17.791Z',
  createdAt: '2025-02-04T16:47:17.791Z',
  field: 'host.name',
  allowed: true,
  anonymized: false,
  updatedAt: '2025-02-14T16:56:58.086Z',
  namespace: 'default',
  id: 'blnb0ZQBQBIRhhJM6egi',
};
const mockAnonymizationFields = {
  perPage: 1000,
  page: 1,
  total: 2,
  data: [mockField, mockField2],
};

const mockHttp = {} as HttpSetup;
const mockToasts = {
  addSuccess: jest.fn(),
  addDanger: jest.fn(),
} as unknown as IToasts;

describe('useAnonymizationUpdater', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useAnonymizationUpdater({
        anonymizationFields: mockAnonymizationFields,
        http: mockHttp,
        toasts: mockToasts,
      })
    );

    expect(result.current.hasPendingChanges).toBe(false);
    expect(result.current.updatedAnonymizationData).toEqual(mockAnonymizationFields);
  });

  it('should update hasPendingChanges and updatedAnonymizationData on onListUpdated', async () => {
    const { result } = renderHook(() =>
      useAnonymizationUpdater({
        anonymizationFields: mockAnonymizationFields,
        http: mockHttp,
        toasts: mockToasts,
      })
    );

    const updates: BatchUpdateListItem[] = [
      {
        field: 'user.name',
        update: 'allow',
        operation: 'add',
      },
    ];

    await act(async () => {
      await result.current.onListUpdated(updates);
    });

    expect(result.current.hasPendingChanges).toBe(true);
    expect(result.current.updatedAnonymizationData.data[0].allowed).toBe(true);
  });

  it('should make updates to multiple fields and resets on cancel', async () => {
    const mockBulkUpdate = bulkUpdateAnonymizationFields as jest.Mock;
    mockBulkUpdate.mockResolvedValueOnce({
      success: true,
    });

    const { result } = renderHook(() =>
      useAnonymizationUpdater({
        anonymizationFields: mockAnonymizationFields,
        http: mockHttp,
        toasts: mockToasts,
      })
    );

    const update1: BatchUpdateListItem[] = [
      {
        field: 'user.name',
        update: 'allowReplacement',
        operation: 'add',
      },
    ];

    const update2: BatchUpdateListItem[] = [
      {
        field: 'host.name',
        update: 'allowReplacement',
        operation: 'add',
      },
    ];

    //   allowed: true,
    //   anonymized: false,
    await act(async () => {
      await result.current.onListUpdated(update1);
    });
    expect(result.current.hasPendingChanges).toBe(true);
    expect(result.current.updatedAnonymizationData).toEqual({
      ...mockAnonymizationFields,
      data: [mockField2, { ...mockField, anonymized: true }],
    });
    await act(async () => {
      await result.current.onListUpdated(update2);
    });
    expect(result.current.updatedAnonymizationData).toEqual({
      ...mockAnonymizationFields,
      data: [
        { ...mockField, anonymized: true },
        { ...mockField2, anonymized: true },
      ],
    });

    act(() => {
      result.current.resetAnonymizationSettings();
    });

    expect(result.current.hasPendingChanges).toBe(false);
    expect(result.current.updatedAnonymizationData).toEqual(mockAnonymizationFields);
  });

  it('should call bulkUpdateAnonymizationFields on saveAnonymizationSettings', async () => {
    const mockBulkUpdate = bulkUpdateAnonymizationFields as jest.Mock;
    mockBulkUpdate.mockResolvedValueOnce({
      success: true,
    });

    const { result } = renderHook(() =>
      useAnonymizationUpdater({
        anonymizationFields: mockAnonymizationFields,
        http: mockHttp,
        toasts: mockToasts,
      })
    );

    const updates: BatchUpdateListItem[] = [
      {
        field: 'user.name',
        update: 'allow',
        operation: 'remove',
      },
    ];

    await act(async () => {
      await result.current.onListUpdated(updates);
    });
    await act(async () => {
      const success = await result.current.saveAnonymizationSettings();
      expect(success).toBe(true);
    });

    expect(mockBulkUpdate).toHaveBeenCalledWith(
      mockHttp,
      {
        update: [
          {
            ...mockField,
            allowed: false,
            anonymized: false,
          },
        ],
      },
      mockToasts
    );
    expect(result.current.hasPendingChanges).toBe(false);
  });

  it('should handle failure in saveAnonymizationSettings', async () => {
    (bulkUpdateAnonymizationFields as jest.Mock).mockResolvedValueOnce({
      success: false,
    });

    const { result } = renderHook(() =>
      useAnonymizationUpdater({
        anonymizationFields: mockAnonymizationFields,
        http: mockHttp,
        toasts: mockToasts,
      })
    );

    const updates: BatchUpdateListItem[] = [
      {
        field: 'user.name',
        update: 'allow',
        operation: 'add',
      },
    ];

    await act(async () => {
      await result.current.onListUpdated(updates);
    });
    await act(async () => {
      const success = await result.current.saveAnonymizationSettings();
      expect(success).toBe(false);
    });

    expect(bulkUpdateAnonymizationFields).toHaveBeenCalledTimes(1);
  });
});
