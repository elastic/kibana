/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { act, waitFor, renderHook } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import { useCreateConnector } from './use_create_connector';

vi.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as Mocked<typeof useKibana>;

describe('useCreateConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKibanaMock().services.http.post = vi.fn().mockResolvedValue({ id: 'test-id' });
  });

  it('init', async () => {
    const { result } = renderHook(() => useCreateConnector());

    expect(result.current).toEqual({
      isLoading: false,
      createConnectorError: null,
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
        id: 'test-id',
      });
    });

    await waitFor(() =>
      expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
        '/api/actions/connector/test-id',
        {
          body: '{"name":"test","config":{},"secrets":{},"connector_type_id":".test"}',
        }
      )
    );
  });

  it('shows an error toast on error', async () => {
    const error = {
      name: 'Error',
      body: {
        statusCode: 500,
        message: 'Internal server error',
      },
    };
    useKibanaMock().services.http.post = vi.fn().mockRejectedValue(error);
    const addErrorMock = useKibanaMock().services.notifications.toasts.addError as Mock;

    const { result } = renderHook(() => useCreateConnector());

    act(() => {
      result.current.createConnector({
        actionTypeId: '.test',
        name: 'test',
        config: {},
        secrets: {},
        id: 'test-id',
      });
    });

    await waitFor(() => {
      expect(addErrorMock).toHaveBeenCalledWith(error, {
        title: 'Unable to create a connector.',
        toastMessage: 'Internal server error',
      });
      expect(result.current.createConnectorError).toEqual({
        title: 'Unable to create a connector.',
        message: 'Internal server error',
      });
    });
  });
});
