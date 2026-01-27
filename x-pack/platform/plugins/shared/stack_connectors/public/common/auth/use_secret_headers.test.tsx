/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useSecretHeaders } from './use_secret_headers';
import type { DeepPartial } from '@kbn/utility-types';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

jest.mock('@kbn/triggers-actions-ui-plugin/public');
jest.mocked<() => DeepPartial<ReturnType<typeof useKibana>>>(useKibana).mockReturnValue({
  services: {
    http,
    notifications,
  },
});

const { queryClient, provider: wrapper } = createTestResponseOpsQueryClient({
  dependencies: {
    notifications,
  },
});

describe('useSecretHeaders', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('fetches secret headers successfully', async () => {
    http.get.mockResolvedValue(['secretHeader1', 'secretHeader2']);
    const { result } = renderHook(() => useSecretHeaders('connector1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(['secretHeader1', 'secretHeader2']);
    });

    expect(http.get).toHaveBeenCalledWith('/internal/stack_connectors/connector1/secret_headers');
  });

  it('returns empty array if connectorId is undefined', async () => {
    const { result } = renderHook(() => useSecretHeaders(undefined), { wrapper });

    expect(result.current.data).toEqual([]);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('calls toasts.addError when fetching the secret headers fails', async () => {
    const error = { body: { message: 'Failed' }, name: 'Error' };
    http.get.mockRejectedValue(error);

    renderHook(() => useSecretHeaders('connector1'), { wrapper });

    await waitFor(() => {
      expect(notifications.toasts.addError).toHaveBeenCalledWith(error, {
        title: 'Error fetching secret headers',
      });
    });
  });
});
