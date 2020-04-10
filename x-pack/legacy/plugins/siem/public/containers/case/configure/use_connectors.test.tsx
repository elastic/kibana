/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useConnectors, ReturnConnectors } from './use_connectors';
import { connectorsMock } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnConnectors>(() =>
        useConnectors()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: true,
        connectors: [],
        refetchConnectors: result.current.refetchConnectors,
      });
    });
  });

  test('fetch connectors', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnConnectors>(() =>
        useConnectors()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: false,
        connectors: connectorsMock,
        refetchConnectors: result.current.refetchConnectors,
      });
    });
  });

  test('refetch connectors', async () => {
    const spyOnfetchConnectors = jest.spyOn(api, 'fetchConnectors');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnConnectors>(() =>
        useConnectors()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.refetchConnectors();
      expect(spyOnfetchConnectors).toHaveBeenCalledTimes(2);
    });
  });

  test('set isLoading to true when refetching connectors', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnConnectors>(() =>
        useConnectors()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.refetchConnectors();

      expect(result.current.loading).toBe(true);
    });
  });

  test('unhappy path', async () => {
    const spyOnfetchConnectors = jest.spyOn(api, 'fetchConnectors');
    spyOnfetchConnectors.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnConnectors>(() =>
        useConnectors()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        connectors: [],
        refetchConnectors: result.current.refetchConnectors,
      });
    });
  });
});
