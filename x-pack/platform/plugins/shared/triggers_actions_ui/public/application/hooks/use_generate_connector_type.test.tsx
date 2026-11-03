/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { createConnectorType } from '../lib/action_connector_api';
import { useGenerateConnectorType } from './use_generate_connector_type';

jest.mock('../../common/lib/kibana');
jest.mock('../lib/action_connector_api', () => ({
  ...(jest.requireActual('../lib/action_connector_api') as object),
  createConnectorType: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const connectorType: CreateConnectorTypeRequest = {
  id: 'acme',
  displayName: 'Acme',
  description: 'Talks to Acme',
  config: [],
  auth: { type: 'none' },
  actions: {
    ping: {
      description: 'Ping',
      scope: 'read',
      input: [],
      request: { method: 'GET', url: 'https://example.com/ping' },
    },
  },
};

describe('useGenerateConnectorType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.http.post = jest.fn().mockResolvedValue({ connectorType });
  });

  it('init', async () => {
    const { result } = renderHook(() => useGenerateConnectorType());

    expect(result.current).toEqual({
      isLoading: false,
      generateConnectorTypeError: null,
      generateConnectorType: expect.anything(),
    });
  });

  it('returns the draft and does not create the connector type', async () => {
    const { result } = renderHook(() => useGenerateConnectorType());

    let response: CreateConnectorTypeRequest | undefined;
    await act(async () => {
      response = await result.current.generateConnectorType('https://docs.example.com/api');
    });

    expect(response).toEqual(connectorType);
    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      '/internal/triggers_actions_ui/connector_types/_generate',
      { body: JSON.stringify({ url: 'https://docs.example.com/api' }) }
    );
    expect(createConnectorType).not.toHaveBeenCalled();
    expect(useKibanaMock().services.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    expect(result.current.generateConnectorTypeError).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sets title, message and reason from the response body', async () => {
    const error = {
      body: {
        message: 'No AI model is available.',
        attributes: { reason: 'no_model' },
      },
    };
    useKibanaMock().services.http.post = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useGenerateConnectorType());

    await act(async () => {
      await result.current.generateConnectorType('https://docs.example.com/api');
    });

    await waitFor(() => {
      expect(result.current.generateConnectorTypeError).toEqual({
        title: 'Unable to generate a connector draft.',
        message: 'No AI model is available.',
        reason: 'no_model',
      });
    });
    expect(createConnectorType).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
