/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { useCreateConnectorType } from './use_create_connector_type';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const connectorType: CreateConnectorTypeRequest = {
  id: '.my-type',
  displayName: 'My type',
  description: '',
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

describe('useCreateConnectorType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.http.post = jest.fn().mockResolvedValue({ id: '.my-type' });
  });

  it('init', async () => {
    const { result } = renderHook(() => useCreateConnectorType());

    expect(result.current).toEqual({
      isLoading: false,
      createConnectorTypeError: null,
      createConnectorType: expect.anything(),
    });
  });

  it('executes correctly', async () => {
    const { result } = renderHook(() => useCreateConnectorType());

    act(() => {
      result.current.createConnectorType(connectorType);
    });

    await waitFor(() =>
      expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
        '/api/actions/connector_types',
        { body: JSON.stringify(connectorType) }
      )
    );
    expect(useKibanaMock().services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      "Registered connector type 'My type'"
    );
  });

  it('shows an error toast on error', async () => {
    const error = {
      name: 'Error',
      body: {
        statusCode: 409,
        message: 'Connector type ".my-type" is already registered.',
      },
    };
    useKibanaMock().services.http.post = jest.fn().mockRejectedValue(error);
    const addErrorMock = useKibanaMock().services.notifications.toasts.addError as jest.Mock;

    const { result } = renderHook(() => useCreateConnectorType());

    act(() => {
      result.current.createConnectorType(connectorType);
    });

    await waitFor(() => {
      expect(addErrorMock).toHaveBeenCalledWith(error, {
        title: 'Unable to create the connector type.',
        toastMessage: 'Connector type ".my-type" is already registered.',
      });
      expect(result.current.createConnectorTypeError).toEqual({
        title: 'Unable to create the connector type.',
        message: 'Connector type ".my-type" is already registered.',
      });
    });
  });
});
