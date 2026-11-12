/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useObjectUrl } from './use_object_url';

const SRC = '/abc/s/my-space/api/files/files/agentBuilderChatImages/file-1/blob';
const OBJECT_URL = 'blob:http://localhost/object-url';

const okResponse = { ok: true, blob: () => Promise.resolve(new Blob(['image'])) } as Response;

const mockFetch = jest.fn();
const mockCreateObjectURL = jest.fn(() => OBJECT_URL);
const mockRevokeObjectURL = jest.fn();

// The jest jsdom polyfill installs a non-writable `URL.createObjectURL`, so shadow it on a subclass.
class MockURL extends URL {
  static createObjectURL = mockCreateObjectURL;
  static revokeObjectURL = mockRevokeObjectURL;
}

Object.defineProperty(global, 'fetch', { value: mockFetch, writable: true });
Object.defineProperty(global, 'URL', { value: MockURL, writable: true });

describe('useObjectUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches src without adding a base path and revokes the object URL on unmount', async () => {
    mockFetch.mockResolvedValue(okResponse);

    const { result, unmount } = renderHook(() => useObjectUrl(SRC));

    await waitFor(() => expect(result.current).toBe(OBJECT_URL));
    expect(mockFetch).toHaveBeenCalledWith(SRC);

    unmount();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
  });

  it('stays undefined when the response is not ok', async () => {
    mockFetch.mockResolvedValue({ ...okResponse, ok: false });

    const { result } = renderHook(() => useObjectUrl(SRC));
    await act(async () => {});

    expect(result.current).toBeUndefined();
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it('does not create an object URL when unmounted before the fetch resolves', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    mockFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { unmount } = renderHook(() => useObjectUrl(SRC));
    unmount();
    await act(async () => resolveFetch(okResponse));

    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });
});
