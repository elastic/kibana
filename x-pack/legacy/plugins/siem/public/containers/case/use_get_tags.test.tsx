/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useGetTags, TagsState } from './use_get_tags';
import { tags } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useGetTags', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, TagsState>(() => useGetTags());
      await waitForNextUpdate();
      expect(result.current).toEqual({
        tags: [],
        isLoading: true,
        isError: false,
      });
    });
  });

  it('calls getTags api', async () => {
    const spyOnGetTags = jest.spyOn(api, 'getTags');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, TagsState>(() => useGetTags());
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(spyOnGetTags).toBeCalledWith(abortCtrl.signal);
    });
  });

  it('fetch tags', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, TagsState>(() => useGetTags());
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        tags,
        isLoading: false,
        isError: false,
      });
    });
  });

  it('unhappy path', async () => {
    const spyOnGetTags = jest.spyOn(api, 'getTags');
    spyOnGetTags.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, TagsState>(() => useGetTags());
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        tags: [],
        isLoading: false,
        isError: true,
      });
    });
  });
});
