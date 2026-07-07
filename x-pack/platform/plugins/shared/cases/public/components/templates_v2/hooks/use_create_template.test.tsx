/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCreateTemplate } from './use_create_template';
import { postTemplate } from '../api/api';
import { casesQueriesKeys } from '../../../containers/constants';
import { useCasesToast } from '../../../common/use_cases_toast';
import { TestProviders, createTestQueryClient } from '../../../common/mock';
import * as i18n from '../translations';

jest.mock('../api/api');
jest.mock('../../../common/use_cases_toast');

describe('useCreateTemplate', () => {
  const showErrorToast = jest.fn();
  const showSuccessToast = jest.fn();

  const templateInput = {
    owner: 'securitySolution',
    definition: 'fields:\n  - name: test_field\n    type: keyword',
  };

  const templateResponse = {
    templateId: 'template-1',
    name: 'New Template',
    owner: 'securitySolution',
    definition: templateInput.definition,
    templateVersion: 1,
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast, showSuccessToast });
  });

  it('calls postTemplate with the template payload', async () => {
    (postTemplate as jest.Mock).mockResolvedValue(templateResponse);

    const { result } = renderHook(() => useCreateTemplate(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ template: templateInput });
    });

    await waitFor(() => expect(postTemplate).toHaveBeenCalledWith({ template: templateInput }));
  });

  it('invalidates templates query and shows success toast', async () => {
    (postTemplate as jest.Mock).mockResolvedValue(templateResponse);
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateTemplate(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate({ template: templateInput });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(casesQueriesKeys.templates);
    });

    expect(showSuccessToast).toHaveBeenCalledWith(i18n.SUCCESS_CREATING_TEMPLATE);
  });

  it('does not show default success toast when disabled', async () => {
    (postTemplate as jest.Mock).mockResolvedValue(templateResponse);

    const { result } = renderHook(() => useCreateTemplate({ disableDefaultSuccessToast: true }), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ template: templateInput });
    });

    await waitFor(() => expect(postTemplate).toHaveBeenCalled());
    expect(showSuccessToast).not.toHaveBeenCalled();
  });

  it('calls the onSuccess callback with the response', async () => {
    (postTemplate as jest.Mock).mockResolvedValue(templateResponse);
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useCreateTemplate({ onSuccess }), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ template: templateInput });
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(templateResponse));
  });

  it('shows an error toast when the request fails', async () => {
    const error = new Error('test error');
    (postTemplate as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateTemplate(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ template: templateInput });
    });

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(error, {
        title: i18n.ERROR_CREATING_TEMPLATE,
      })
    );
  });
});
