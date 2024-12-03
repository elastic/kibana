/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
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
      const { waitForNextUpdate } = renderHook(() => useLoadActionTypes(defaultProps));
      await waitForNextUpdate();

      expect(defaultProps.http.get).toHaveBeenCalledWith('/api/actions/connector_types', {
        query: { feature_id: 'generativeAIForSecurity' },
      });
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });

  it('should return sorted action types', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useLoadActionTypes(defaultProps));
      await waitForNextUpdate();

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
      const { waitForNextUpdate } = renderHook(() =>
        useLoadActionTypes({ ...defaultProps, http: mockHttp })
      );
      await waitForNextUpdate();

      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
