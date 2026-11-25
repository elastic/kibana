/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnectorWithoutId } from '../../../types';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { createActionConnector } from '.';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

const getRequestBody = (call: unknown): Record<string, unknown> => {
  const [, options] = call as [string, { body: string }];
  return JSON.parse(options.body);
};

describe('createActionConnector', () => {
  test('should call create action API', async () => {
    const apiResponse = {
      connector_type_id: 'test',
      is_preconfigured: false,
      is_deprecated: false,
      name: 'My test',
      config: {},
      secrets: {},
      id: '123',
    };
    http.post.mockResolvedValueOnce(apiResponse);

    const connector: Pick<
      ActionConnectorWithoutId,
      'actionTypeId' | 'name' | 'config' | 'secrets'
    > = {
      actionTypeId: 'test',
      name: 'My test',
      config: {},
      secrets: {},
    };
    const resolvedValue = {
      ...connector,
      id: '123',
      isDeprecated: false,
      isPreconfigured: false,
      isMissingSecrets: undefined,
    };

    const result = await createActionConnector({ http, connector });
    expect(result).toEqual(resolvedValue);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connector",
        Object {
          "body": "{\\"name\\":\\"My test\\",\\"config\\":{},\\"secrets\\":{},\\"connector_type_id\\":\\"test\\"}",
        },
      ]
    `);
  });

  test('should call create action API with specific id when provided', async () => {
    const apiResponse = {
      connector_type_id: 'test',
      is_preconfigured: false,
      is_deprecated: false,
      name: 'My test',
      config: {},
      secrets: {},
      id: 'my-custom-id',
    };
    http.post.mockResolvedValueOnce(apiResponse);

    const connector: Pick<
      ActionConnectorWithoutId,
      'actionTypeId' | 'name' | 'config' | 'secrets'
    > = {
      actionTypeId: 'test',
      name: 'My test',
      config: {},
      secrets: {},
    };

    const result = await createActionConnector({ http, connector, id: 'my-custom-id' });
    expect(result).toMatchObject({ id: 'my-custom-id' });
    expect(http.post.mock.calls[0][0]).toBe('/api/actions/connector/my-custom-id');
  });

  test('should map auth_mode from the API response to authMode', async () => {
    const apiResponse = {
      connector_type_id: 'test',
      is_preconfigured: false,
      is_deprecated: false,
      name: 'My test',
      config: {},
      secrets: {},
      id: '123',
      auth_mode: 'shared',
    };
    http.post.mockResolvedValueOnce(apiResponse);

    const connector: Pick<
      ActionConnectorWithoutId,
      'actionTypeId' | 'name' | 'config' | 'secrets'
    > = {
      actionTypeId: 'test',
      name: 'My test',
      config: {},
      secrets: {},
    };

    const result = await createActionConnector({ http, connector });
    expect(result).toMatchObject({ authMode: 'shared' });
  });

  test('should map is_inbound_events_enabled on the request and response', async () => {
    const apiResponse = {
      connector_type_id: '.dual',
      is_preconfigured: false,
      is_deprecated: false,
      name: 'My dual',
      config: {},
      secrets: {},
      id: '123',
      is_inbound_events_enabled: true,
    };
    http.post.mockResolvedValueOnce(apiResponse);

    const result = await createActionConnector({
      http,
      connector: {
        actionTypeId: '.dual',
        name: 'My dual',
        config: {},
        secrets: {},
        isInboundEventsEnabled: true,
      },
    });

    expect(result).toMatchObject({ isInboundEventsEnabled: true });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connector",
        Object {
          "body": "{\\"name\\":\\"My dual\\",\\"config\\":{},\\"secrets\\":{},\\"connector_type_id\\":\\".dual\\",\\"is_inbound_events_enabled\\":true}",
        },
      ]
    `);
  });

  test('should map is_outbound_actions_enabled on the request and response', async () => {
    http.post.mockResolvedValueOnce({
      connector_type_id: '.dual',
      is_preconfigured: false,
      is_deprecated: false,
      name: 'My dual',
      config: {},
      secrets: {},
      id: '123',
      is_inbound_events_enabled: true,
      is_outbound_actions_enabled: false,
    });

    const result = await createActionConnector({
      http,
      connector: {
        actionTypeId: '.dual',
        name: 'My dual',
        config: {},
        secrets: {},
        isInboundEventsEnabled: true,
        isOutboundActionsEnabled: false,
      },
    });

    expect(result).toMatchObject({ isOutboundActionsEnabled: false });
    expect(getRequestBody(http.post.mock.calls[0])).toEqual({
      name: 'My dual',
      config: {},
      secrets: {},
      connector_type_id: '.dual',
      is_inbound_events_enabled: true,
      is_outbound_actions_enabled: false,
    });
  });

  test('should not send is_outbound_actions_enabled when it is not set', async () => {
    http.post.mockResolvedValueOnce({
      connector_type_id: '.slack',
      is_preconfigured: false,
      is_deprecated: false,
      name: 'Slack',
      config: {},
      secrets: {},
      id: '123',
    });

    const result = await createActionConnector({
      http,
      connector: { actionTypeId: '.slack', name: 'Slack', config: {}, secrets: {} },
    });

    expect(result).not.toHaveProperty('isOutboundActionsEnabled');
    expect(getRequestBody(http.post.mock.calls[0])).not.toHaveProperty(
      'is_outbound_actions_enabled'
    );
  });
});
