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
import { useCreateFieldDefinition } from './use_create_field_definition';
import { postFieldDefinition } from '../api/api';
import { casesQueriesKeys } from '../../../containers/constants';
import { useCasesToast } from '../../../common/use_cases_toast';
import { TestProviders, createTestQueryClient } from '../../../common/mock';
import * as i18n from '../translations';

vi.mock('../api/api');
vi.mock('../../../common/use_cases_toast');

const mockReportFieldDefinitionCreated = vi.fn();
vi.mock('../../../analytics/field_library', () => {
      const mocked = {
      useFieldDefinitionCreatedEBT: () => mockReportFieldDefinitionCreated,
    };
      return { ...mocked, default: mocked };
    });

describe('useCreateFieldDefinition', () => {
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

  it('calls postFieldDefinition with the input payload', async () => {
    (postFieldDefinition as Mock).mockResolvedValue(fieldDefinitionResponse);

    const { result } = renderHook(() => useCreateFieldDefinition(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ fieldDefinition: fieldDefinitionInput });
    });

    await waitFor(() =>
      expect(postFieldDefinition).toHaveBeenCalledWith({ fieldDefinition: fieldDefinitionInput })
    );
  });

  it('invalidates field definitions query and shows success toast', async () => {
    (postFieldDefinition as Mock).mockResolvedValue(fieldDefinitionResponse);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateFieldDefinition(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate({ fieldDefinition: fieldDefinitionInput });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(casesQueriesKeys.fieldDefinitions);
    });

    expect(showSuccessToast).toHaveBeenCalledWith(i18n.SUCCESS_CREATING_FIELD_DEFINITION);
  });

  it('calls the onSuccess callback with the server response', async () => {
    (postFieldDefinition as Mock).mockResolvedValue(fieldDefinitionResponse);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useCreateFieldDefinition({ onSuccess }), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ fieldDefinition: fieldDefinitionInput });
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(fieldDefinitionResponse));
  });

  it('shows an error toast when the request fails', async () => {
    const error = new Error('Network error');
    (postFieldDefinition as Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateFieldDefinition(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ fieldDefinition: fieldDefinitionInput });
    });

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(error, {
        title: i18n.ERROR_CREATING_FIELD_DEFINITION,
      })
    );
  });

  describe('telemetry', () => {
    it('reports the created event with is_global true for a global field', async () => {
      (postFieldDefinition as Mock).mockResolvedValue({
        ...fieldDefinitionResponse,
        isGlobal: true,
      });

      const { result } = renderHook(() => useCreateFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionCreated).toHaveBeenCalledWith({ isGlobal: true });
      });

      expect(mockReportFieldDefinitionCreated).toHaveBeenCalledTimes(1);
    });

    it('reports is_global false when the server returns isGlobal: false', async () => {
      (postFieldDefinition as Mock).mockResolvedValue({
        ...fieldDefinitionResponse,
        isGlobal: false,
      });

      const { result } = renderHook(() => useCreateFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionCreated).toHaveBeenCalledWith({ isGlobal: false });
      });
    });

    it('reports is_global false when the server omits the isGlobal field', async () => {
      (postFieldDefinition as Mock).mockResolvedValue(fieldDefinitionResponse);

      const { result } = renderHook(() => useCreateFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionCreated).toHaveBeenCalledWith({ isGlobal: false });
      });
    });

    it('does not report when the request fails', async () => {
      (postFieldDefinition as Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCreateFieldDefinition(), { wrapper: TestProviders });

      act(() => {
        result.current.mutate({ fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => expect(showErrorToast).toHaveBeenCalled());

      expect(mockReportFieldDefinitionCreated).not.toHaveBeenCalled();
    });

    it('does not report on mount before the mutation is called', () => {
      renderHook(() => useCreateFieldDefinition(), { wrapper: TestProviders });

      expect(mockReportFieldDefinitionCreated).not.toHaveBeenCalled();
    });

    // The report lives in the mutation's own onSuccess callback so it runs even when the caller
    // unmounts before the server answers (React Query skips a per-call options.onSuccess on unmount
    // but always runs the mutation-level onSuccess).
    it('still reports when the caller unmounts before the server answers', async () => {
      let resolvePost: (value: unknown) => void;
      (postFieldDefinition as Mock).mockImplementation(
        () => new Promise((resolve) => (resolvePost = resolve))
      );

      const { result, unmount } = renderHook(() => useCreateFieldDefinition(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ fieldDefinition: fieldDefinitionInput });
      });

      await waitFor(() => expect(postFieldDefinition).toHaveBeenCalled());

      unmount();

      act(() => {
        resolvePost({ ...fieldDefinitionResponse, isGlobal: true });
      });

      await waitFor(() => {
        expect(mockReportFieldDefinitionCreated).toHaveBeenCalledTimes(1);
      });

      expect(mockReportFieldDefinitionCreated).toHaveBeenCalledWith({ isGlobal: true });
    });
  });
});
