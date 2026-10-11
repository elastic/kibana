/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeleteFieldDefinition } from './use_delete_field_definition';
import { deleteFieldDefinition } from '../api/api';
import { casesQueriesKeys } from '../../../containers/constants';
import { useCasesToast } from '../../../common/use_cases_toast';
import { TestProviders, createTestQueryClient } from '../../../common/mock';
import * as i18n from '../translations';

jest.mock('../api/api');
jest.mock('../../../common/use_cases_toast');

const mockReportFieldDefinitionDeleted = jest.fn();
jest.mock('../../../analytics/field_library', () => ({
  useFieldDefinitionDeletedEBT: () => mockReportFieldDefinitionDeleted,
}));

describe('useDeleteFieldDefinition', () => {
  const showErrorToast = jest.fn();
  const showSuccessToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast, showSuccessToast });
  });

  it('calls deleteFieldDefinition with the id', async () => {
    (deleteFieldDefinition as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteFieldDefinition(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ id: 'fd-1' });
    });

    await waitFor(() => expect(deleteFieldDefinition).toHaveBeenCalledWith({ id: 'fd-1' }));
  });

  it('invalidates field definitions query and shows success toast', async () => {
    (deleteFieldDefinition as jest.Mock).mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteFieldDefinition(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate({ id: 'fd-1' });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(casesQueriesKeys.fieldDefinitions);
    });

    expect(showSuccessToast).toHaveBeenCalledWith(i18n.SUCCESS_DELETING_FIELD_DEFINITION);
  });

  it('calls the onSuccess callback', async () => {
    (deleteFieldDefinition as jest.Mock).mockResolvedValue(undefined);
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useDeleteFieldDefinition({ onSuccess }), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ id: 'fd-1' });
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('shows an error toast when the request fails', async () => {
    const error = new Error('Network error');
    (deleteFieldDefinition as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteFieldDefinition(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ id: 'fd-1' });
    });

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(error, {
        title: i18n.ERROR_DELETING_FIELD_DEFINITION,
      })
    );
  });

  describe('telemetry', () => {
    it('reports the deleted event on success', async () => {
      (deleteFieldDefinition as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ id: 'fd-1' });
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionDeleted).toHaveBeenCalledTimes(1);
      });
    });

    it('does not report when the request fails', async () => {
      (deleteFieldDefinition as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDeleteFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ id: 'fd-1' });
      });

      await waitFor(() => expect(showErrorToast).toHaveBeenCalled());

      expect(mockReportFieldDefinitionDeleted).not.toHaveBeenCalled();
    });

    it('does not report on mount before the mutation is called', () => {
      renderHook(() => useDeleteFieldDefinition(), { wrapper: TestProviders });

      expect(mockReportFieldDefinitionDeleted).not.toHaveBeenCalled();
    });

    it('still reports when the caller unmounts before the server answers', async () => {
      let resolveDelete: (value: unknown) => void;
      (deleteFieldDefinition as jest.Mock).mockImplementation(
        () => new Promise((resolve) => (resolveDelete = resolve))
      );

      const { result, unmount } = renderHook(() => useDeleteFieldDefinition(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ id: 'fd-1' });
      });

      await waitFor(() => expect(deleteFieldDefinition).toHaveBeenCalled());

      unmount();

      act(() => {
        resolveDelete(undefined);
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionDeleted).toHaveBeenCalledTimes(1);
      });
    });
  });
});
