/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMockServer,
  createMockServerWithoutActionClientDecoration,
  createMockServerWithoutAlertClientDecoration,
  createMockServerWithoutActionOrAlertClientDecoration,
} from './_mock_server';
import { createSignalsRoute } from './create_signals_route';
import { ServerInjectOptions } from 'hapi';
import { ActionResult } from '../../../../../actions/server/types';

const getCreateRequest = (): ServerInjectOptions => ({
  method: 'POST',
  url: '/api/siem/signals',
  payload: {
    id: 'rule-1',
    description: 'Detecting root and admin users',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    interval: '5m',
    name: 'Detect Root/Admin Users',
    severity: 1,
    type: 'kql',
    from: 'now-6m',
    to: 'now',
    kql: 'user.name: root or user.name: admin',
  },
});

const getFindResult = () => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [{}],
});

const getResult = () => ({
  id: 'result-1',
  enabled: false,
  alertTypeId: '',
  interval: undefined,
  actions: undefined,
  alertTypeParams: undefined,
});

const createActionResult = (): ActionResult => ({
  id: 'result-1',
  actionTypeId: 'action-id-1',
  description: '',
  config: {},
});

const createAlertResult = () => ({
  id: 'rule-1',
  alertTypeId: 'siem.signals',
  alertTypeParams: {
    description: 'Detecting root and admin users',
    id: 'rule-1',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    from: 'now-6m',
    filter: null,
    kql: 'user.name: root or user.name: admin',
    maxSignals: 100,
    name: 'Detect Root/Admin Users',
    severity: 1,
    to: 'now',
    type: 'kql',
    references: [],
  },
  interval: '5m',
  enabled: true,
  actions: [
    {
      group: 'default',
      params: {
        message: 'SIEM Alert Fired',
        level: 'info',
      },
      id: '9c3846a3-dbf9-40ce-ba7e-ef635499afa6',
    },
  ],
  throttle: null,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  apiKeyOwner: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '78d036d0-f042-11e9-a9ae-51b9a11630ec',
});

describe('create_signals', () => {
  let { server, alertsClient, actionsClient } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ server, alertsClient, actionsClient } = createMockServer());
    createSignalsRoute(server);
  });

  describe('status codes with actionClient and alertClient', () => {
    it('returns 200 when deleting a single signal with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(createAlertResult());
      const { statusCode } = await server.inject(getCreateRequest());
      expect(statusCode).toBe(200);
    });

    it('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      createSignalsRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });

    it('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      createSignalsRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });

    it('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      createSignalsRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    it('returns 400 if id is not given', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'POST',
        url: '/api/siem/signals',
        payload: {
          // missing id should throw a 400
          description: 'Detecting root and admin users',
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          name: 'Detect Root/Admin Users',
          severity: 1,
          type: 'kql',
          from: 'now-6m',
          to: 'now',
          kql: 'user.name: root or user.name: admin',
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
