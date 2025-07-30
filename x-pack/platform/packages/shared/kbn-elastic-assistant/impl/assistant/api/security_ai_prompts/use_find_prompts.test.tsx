/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useFindPrompts, UseFindPromptsParams } from './use_find_prompts';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND,
} from '@kbn/elastic-assistant-common';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { IToasts } from '@kbn/core-notifications-browser';

const mockHttpFetch = jest.fn();
const mockToasts = {
  addSuccess: jest.fn(),
  addError: jest.fn(),
} as unknown as IToasts;

describe('useFindPrompts', () => {
  const params: UseFindPromptsParams = {
    context: {
      isAssistantEnabled: true,
      httpFetch: mockHttpFetch,
      toasts: mockToasts,
    },
    params: {
      connector_id: 'connector-1',
      prompt_ids: ['prompt-1'],
      prompt_group_id: 'group-1',
    },
    signal: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial and placeholder data when loading', async () => {
    mockHttpFetch.mockResolvedValueOnce({ prompts: [{ id: 'prompt-1', name: 'Prompt 1' }] });
    const { result } = renderHook(() => useFindPrompts(params), {
      wrapper: TestProviders,
    });
    expect(result.current.data).toEqual({ prompts: [] });
    await waitFor(() => result.current.isSuccess);

    await waitFor(() =>
      expect(result.current.data).toEqual({ prompts: [{ id: 'prompt-1', name: 'Prompt 1' }] })
    );
  });

  it('disables the query if isAssistantEnabled is false', async () => {
    const disabledParams = { ...params, context: { ...params.context, isAssistantEnabled: false } };
    const { result } = renderHook(() => useFindPrompts(disabledParams), { wrapper: TestProviders });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ prompts: [] });
    expect(mockHttpFetch).not.toHaveBeenCalled();
  });

  it('calls httpFetch with correct arguments', async () => {
    mockHttpFetch.mockResolvedValueOnce({ prompts: [{ id: 'prompt-1', name: 'Prompt 1' }] });
    const { result } = renderHook(() => useFindPrompts(params), {
      wrapper: TestProviders,
    });
    await waitFor(() => result.current.isSuccess);
    expect(mockHttpFetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND,
      expect.objectContaining({
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {
          connector_id: 'connector-1',
          prompt_ids: ['prompt-1'],
          prompt_group_id: 'group-1',
        },
      })
    );
  });

  it('shows a toast on error', async () => {
    const error = { body: { message: 'Something went wrong' } };
    mockHttpFetch.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useFindPrompts(params), {
      wrapper: TestProviders,
    });
    await waitFor(() => result.current.isError);
    expect(mockToasts.addError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        title: expect.any(String),
      })
    );
  });
});
