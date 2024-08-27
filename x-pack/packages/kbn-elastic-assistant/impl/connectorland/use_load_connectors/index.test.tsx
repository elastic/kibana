/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useLoadConnectors, Props } from '.';
import { mockConnectors } from '../../mock/connectors';

const mockConnectorsAndExtras = [
  ...mockConnectors,
  {
    ...mockConnectors[0],
    id: 'connector-missing-secrets',
    name: 'Connector Missing Secrets',
    isMissingSecrets: true,
  },
  {
    ...mockConnectors[0],

    id: 'connector-wrong-action-type',
    name: 'Connector Wrong Action Type',
    isMissingSecrets: true,
    actionTypeId: '.d3',
  },
];

const connectorsApiResponse = mockConnectorsAndExtras.map((c) => ({
  ...c,
  connector_type_id: c.actionTypeId,
  is_preconfigured: false,
  is_deprecated: false,
  referenced_by_count: 0,
  is_missing_secrets: c.isMissingSecrets,
  is_system_action: false,
}));

const loadConnectorsResult = mockConnectors.map((c) => ({
  ...c,
  isPreconfigured: false,
  isDeprecated: false,
  referencedByCount: 0,
  isSystemAction: false,
}));

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
  get: jest.fn().mockResolvedValue(connectorsApiResponse),
};
const toasts = {
  addError: jest.fn(),
};
const defaultProps = { http, toasts } as unknown as Props;
describe('useLoadConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should call api to load action types', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useLoadConnectors(defaultProps));
      await waitForNextUpdate();

      expect(defaultProps.http.get).toHaveBeenCalledWith('/api/actions/connectors');
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });

  it('should return sorted action types, removing isMissingSecrets and wrong action type ids', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useLoadConnectors(defaultProps));
      await waitForNextUpdate();

      await expect(result.current).resolves.toStrictEqual(
        // @ts-ignore ts does not like config, but we define it in the mock data
        loadConnectorsResult.map((c) => ({ ...c, apiProvider: c.config.apiProvider }))
      );
    });
  });
  it('should display error toast when api throws error', async () => {
    await act(async () => {
      const mockHttp = {
        get: jest.fn().mockRejectedValue(new Error('this is an error')),
      } as unknown as Props['http'];
      const { waitForNextUpdate } = renderHook(() =>
        useLoadConnectors({ ...defaultProps, http: mockHttp })
      );
      await waitForNextUpdate();

      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
