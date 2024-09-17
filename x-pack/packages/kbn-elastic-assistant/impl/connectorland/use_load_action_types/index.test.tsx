/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoadActionTypes, Props } from '.';
import { mockActionTypes } from '../../mock/connectors';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation(async (queryKey, fn, opts) => {
    try {
      const res = await fn();
      return Promise.resolve(res);
    } catch (e) {
      opts.onError(e);
    }
  }),
}));

const http = {
  get: jest.fn().mockResolvedValue(mockActionTypes),
};
const toasts = {
  addError: jest.fn(),
};
const defaultProps = { http, toasts } as unknown as Props;
describe('useLoadActionTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should call api to load action types', async () => {
    await act(async () => {
      renderHook(() => useLoadActionTypes(defaultProps));
      await waitFor(() => null);

      expect(defaultProps.http.get).toHaveBeenCalledWith('/api/actions/connector_types', {
        query: { feature_id: 'generativeAIForSecurity' },
      });
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });

  it('should return sorted action types', async () => {
    await act(async () => {
      const { result } = renderHook(() => useLoadActionTypes(defaultProps));
      await waitFor(() => null);

      await expect(result.current).resolves.toStrictEqual(
        mockActionTypes.sort((a, b) => a.name.localeCompare(b.name))
      );
    });
  });
  it('should display error toast when api throws error', async () => {
    await act(async () => {
      const mockHttp = {
        get: jest.fn().mockRejectedValue(new Error('this is an error')),
      } as unknown as Props['http'];
      renderHook(() => useLoadActionTypes({ ...defaultProps, http: mockHttp }));
      await waitFor(() => null);

      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
