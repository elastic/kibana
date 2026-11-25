/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { createQueryClientWrapper } from '../../test_utils';
import { useFetchConnectorsByType } from './use_fetch_connectors_by_type';

const mockHttp = httpServiceMock.createStartContract();
const mockNotifications = notificationServiceMock.createStartContract();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: string) => (token === 'http' ? mockHttp : mockNotifications),
  CoreStart: (key: string) => key,
}));

const connector = (overrides: Record<string, unknown> = {}) => ({
  id: 'slack-1',
  name: 'Slack',
  connector_type_id: '.slack2',
  ...overrides,
});

describe('useFetchConnectorsByType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers connectors of the requested type', async () => {
    mockHttp.get.mockResolvedValue([
      connector(),
      connector({ id: 'email-1', name: 'Email', connector_type_id: '.email' }),
    ]);

    const { result } = renderHook(() => useFetchConnectorsByType({ connectorTypeId: '.slack2' }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.map(({ id }) => id)).toEqual(['slack-1']);
  });

  it('does not offer a connector with outbound actions turned off', async () => {
    mockHttp.get.mockResolvedValue([
      connector({ id: 'slack-on', is_outbound_actions_enabled: true }),
      connector({ id: 'slack-off', is_outbound_actions_enabled: false }),
      connector({ id: 'slack-none' }),
    ]);

    const { result } = renderHook(() => useFetchConnectorsByType({ connectorTypeId: '.slack2' }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.map(({ id }) => id)).toEqual(['slack-on', 'slack-none']);
  });
});
