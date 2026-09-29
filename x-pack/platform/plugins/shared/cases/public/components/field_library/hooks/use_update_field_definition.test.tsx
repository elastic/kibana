/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpdateFieldDefinition } from './use_update_field_definition';
import { putFieldDefinition } from '../api/api';
import { casesQueriesKeys } from '../../../containers/constants';
import { useCasesToast } from '../../../common/use_cases_toast';
import { TestProviders, createTestQueryClient } from '../../../common/mock';
import * as i18n from '../translations';

vi.mock('../api/api');
vi.mock('../../../common/use_cases_toast');

const mockReportFieldDefinitionUpdated = vi.fn();
vi.mock('../../../analytics/field_library', () => {
  const mocked = {
    useFieldDefinitionUpdatedEBT: () => mockReportFieldDefinitionUpdated,
  };
  return { ...mocked, default: mocked };
});

describe('useUpdateFieldDefinition', () => {
  const showErrorToast = vi.fn();
  const showSuccessToast = vi.fn();

  const fieldDefinitionInput = {
    name: 'my_field',
    owner: 'securitySolution',
    definition: 'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\n',
  };

  const fieldDefinitionResponse = {
    fieldDefinitionId: 'fd-1',
    name: 'my_field',
    owner: 'securitySolution',
    definition: fieldDefinitionInput.definition,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useCasesToast as Mock).mockReturnValue({ showErrorToast, showSuccessToast });
  });

  it('calls putFieldDefinition with the id and input payload', async () => {
    (putFieldDefinition as Mock).mockResolvedValue(fieldDefinitionResponse);

    const { result } = renderHook(() => useUpdateFieldDefinition(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ id: 'fd-1', fieldDefinition: fieldDefinitionInput });
    });

    await waitFor(() =>
      expect(putFieldDefinition).toHaveBeenCalledWith({
        id: 'fd-1',
        fieldDefinition: fieldDefinitionInput,
      })
    );
  });

  it('invalidates field definitions query and shows success toast', async () => {
    (putFieldDefinition as Mock).mockResolvedValue(fieldDefinitionResponse);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateFieldDefinition(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate({ id: 'fd-1', fieldDefinition: fieldDefinitionInput });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(casesQueriesKeys.fieldDefinitions);
    });

    expect(showSuccessToast).toHaveBeenCalledWith(i18n.SUCCESS_UPDATING_FIELD_DEFINITION);
  });

  it('calls the onSuccess callback with the server response', async () => {
    (putFieldDefinition as Mock).mockResolvedValue(fieldDefinitionResponse);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useUpdateFieldDefinition({ onSuccess }), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ id: 'fd-1', fieldDefinition: fieldDefinitionInput });
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(fieldDefinitionResponse));
  });

  it('shows an error toast when the request fails', async () => {
    const error = new Error('Network error');
    (putFieldDefinition as Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateFieldDefinition(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ id: 'fd-1', fieldDefinition: fieldDefinitionInput });
    });

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(error, {
        title: i18n.ERROR_UPDATING_FIELD_DEFINITION,
      })
    );
  });

  describe('telemetry', () => {
    it('reports the updated event with is_global true for a global field', async () => {
      (putFieldDefinition as Mock).mockResolvedValue({
        ...fieldDefinitionResponse,
        isGlobal: true,
      });

      const { result } = renderHook(() => useUpdateFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ id: 'fd-1', fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionUpdated).toHaveBeenCalledWith({ isGlobal: true });
      });

      expect(mockReportFieldDefinitionUpdated).toHaveBeenCalledTimes(1);
    });

    it('reports is_global false when the server returns isGlobal: false', async () => {
      (putFieldDefinition as Mock).mockResolvedValue({
        ...fieldDefinitionResponse,
        isGlobal: false,
      });

      const { result } = renderHook(() => useUpdateFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ id: 'fd-1', fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionUpdated).toHaveBeenCalledWith({ isGlobal: false });
      });
    });

    it('reports is_global false when the server omits the isGlobal field', async () => {
      (putFieldDefinition as Mock).mockResolvedValue(fieldDefinitionResponse);

      const { result } = renderHook(() => useUpdateFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ id: 'fd-1', fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionUpdated).toHaveBeenCalledWith({ isGlobal: false });
      });
    });

    it('does not report when the request fails', async () => {
      (putFieldDefinition as Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUpdateFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ id: 'fd-1', fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => expect(showErrorToast).toHaveBeenCalled());

      expect(mockReportFieldDefinitionUpdated).not.toHaveBeenCalled();
    });

    it('does not report on mount before the mutation is called', () => {
      renderHook(() => useUpdateFieldDefinition(), { wrapper: TestProviders });

      expect(mockReportFieldDefinitionUpdated).not.toHaveBeenCalled();
    });

    it('still reports when the caller unmounts before the server answers', async () => {
      let resolvePut: (value: unknown) => void;
      (putFieldDefinition as Mock).mockImplementation(
        () => new Promise((resolve) => (resolvePut = resolve))
      );

      const { result, unmount } = renderHook(() => useUpdateFieldDefinition(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ id: 'fd-1', fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => expect(putFieldDefinition).toHaveBeenCalled());

      unmount();

      act(() => {
        resolvePut({ ...fieldDefinitionResponse, isGlobal: true });
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionUpdated).toHaveBeenCalledTimes(1);
      });

      expect(mockReportFieldDefinitionUpdated).toHaveBeenCalledWith({ isGlobal: true });
    });
  });
});
