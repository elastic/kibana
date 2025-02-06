/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useLoadConnectors, Props } from '.';
import { mockConnectors } from '../../mock/connectors';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { isInferenceEndpointExists } from '@kbn/inference-endpoint-ui-common';

const mockedIsInferenceEndpointExists = isInferenceEndpointExists as jest.Mock;

jest.mock('@kbn/inference-endpoint-ui-common', () => ({
  isInferenceEndpointExists: jest.fn(),
}));

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
    mockedIsInferenceEndpointExists.mockResolvedValue(true);
  });
  it('should call api to load action types', async () => {
    renderHook(() => useLoadConnectors(defaultProps), {
      wrapper: TestProviders,
    });
    await waitFor(() => {
      expect(defaultProps.http.get).toHaveBeenCalledWith('/api/actions/connectors');
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });

  it('should return sorted action types, removing isMissingSecrets and wrong action type ids, excluding .inference results', async () => {
    const { result } = renderHook(() => useLoadConnectors(defaultProps), {
      wrapper: TestProviders,
    });
    await waitFor(() => {
      expect(result.current.data).toStrictEqual(
        loadConnectorsResult
          .filter((c) => c.actionTypeId !== '.inference')
          // @ts-ignore ts does not like config, but we define it in the mock data
          .map((c) => ({ ...c, apiProvider: c.config.apiProvider }))
      );
    });
  });

  it('includes preconfigured .inference results when inferenceEnabled is true', async () => {
    const { result } = renderHook(
      () => useLoadConnectors({ ...defaultProps, inferenceEnabled: true }),
      {
        wrapper: TestProviders,
      }
    );
    await waitFor(() => {
      expect(result.current.data).toStrictEqual(
        mockConnectors
          .filter(
            (c) =>
              c.actionTypeId !== '.inference' ||
              (c.actionTypeId === '.inference' && c.isPreconfigured)
          )
          // @ts-ignore ts does not like config, but we define it in the mock data
          .map((c) => ({ ...c, referencedByCount: 0, apiProvider: c?.config?.apiProvider }))
      );
    });
  });
  it('should display error toast when api throws error', async () => {
    const mockHttp = {
      get: jest.fn().mockRejectedValue(new Error('this is an error')),
    } as unknown as Props['http'];
    renderHook(() => useLoadConnectors({ ...defaultProps, http: mockHttp }), {
      wrapper: TestProviders,
    });
    await waitFor(() => expect(toasts.addError).toHaveBeenCalled());
  });
});
