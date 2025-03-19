/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import { useExecuteConnector } from './use_execute_connector';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useExecuteConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.http.post = jest.fn().mockResolvedValue({ status: 'ok', data: {} });
  });

  it('init', async () => {
    const { result } = renderHook(() => useExecuteConnector());

    expect(result.current).toEqual({
      isLoading: false,
      executeConnector: expect.anything(),
    });
  });

  it('executes correctly', async () => {
    const { result } = renderHook(() => useExecuteConnector());

    act(() => {
      result.current.executeConnector({ connectorId: 'test-id', params: {} });
    });

    await waitFor(() =>
      expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
        '/api/actions/connector/test-id/_execute',
        { body: '{"params":{}}' }
      )
    );
  });
});
