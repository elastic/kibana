/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import { useCreateConnector } from './use_create_connector';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useCreateConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.http.post = jest.fn().mockResolvedValue({ id: 'test-id' });
  });

  it('init', async () => {
    const { result } = renderHook(() => useCreateConnector());

    expect(result.current).toEqual({
      isLoading: false,
      createConnector: expect.anything(),
    });
  });

  it('executes correctly', async () => {
    const { result } = renderHook(() => useCreateConnector());

    act(() => {
      result.current.createConnector({
        actionTypeId: '.test',
        name: 'test',
        config: {},
        secrets: {},
      });
    });

    await waitFor(() =>
      expect(useKibanaMock().services.http.post).toHaveBeenCalledWith('/api/actions/connector', {
        body: '{"name":"test","config":{},"secrets":{},"connector_type_id":".test"}',
      })
    );
  });

  it('includes custom id in the API path when provided', async () => {
    const { result } = renderHook(() => useCreateConnector());

    act(() => {
      result.current.createConnector({
        actionTypeId: '.test',
        name: 'test',
        config: {},
        secrets: {},
        id: 'my-custom-id',
      });
    });

    await waitFor(() =>
      expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
        '/api/actions/connector/my-custom-id',
        {
          body: '{"name":"test","config":{},"secrets":{},"connector_type_id":".test"}',
        }
      )
    );
  });

  it('shows specific error message for duplicate connector ID (409 conflict)', async () => {
    const conflictError = {
      name: 'Error',
      body: {
        statusCode: 409,
        message: 'Conflict',
      },
    };
    useKibanaMock().services.http.post = jest.fn().mockRejectedValue(conflictError);
    const addErrorMock = useKibanaMock().services.notifications.toasts.addError as jest.Mock;

    const { result } = renderHook(() => useCreateConnector());

    await act(async () => {
      await result.current.createConnector({
        actionTypeId: '.test',
        name: 'test',
        config: {},
        secrets: {},
        id: 'duplicate-id',
      });
    });

    await waitFor(() => {
      expect(addErrorMock).toHaveBeenCalledWith(conflictError, {
        title: 'Connector ID already exists',
        toastMessage: 'A connector with this ID already exists. Please choose a different ID.',
      });
    });
  });

  it('shows generic error message for non-conflict errors', async () => {
    const genericError = {
      name: 'Error',
      body: {
        statusCode: 500,
        message: 'Internal server error',
      },
    };
    useKibanaMock().services.http.post = jest.fn().mockRejectedValue(genericError);
    const addErrorMock = useKibanaMock().services.notifications.toasts.addError as jest.Mock;

    const { result } = renderHook(() => useCreateConnector());

    await act(async () => {
      await result.current.createConnector({
        actionTypeId: '.test',
        name: 'test',
        config: {},
        secrets: {},
      });
    });

    await waitFor(() => {
      expect(addErrorMock).toHaveBeenCalledWith(genericError, {
        title: 'Unable to create a connector.',
        toastMessage: 'Internal server error',
      });
    });
  });
});
