/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { ExecutorParams } from '../lib/servicenow/types';
import type { ServiceNowConnectorType, ServiceNowConnectorTypeExecutorOptions } from '.';
import { getServiceNowSIRConnectorType } from '.';
import { api } from './api';
import type { ServiceNowPublicConfigurationType } from '@kbn/connector-schemas/servicenow';

vi.mock('./api', () => {
      const mocked = {
      api: {
        getChoices: vi.fn(),
        getFields: vi.fn(),
        getIncident: vi.fn(),
        handshake: vi.fn(),
        pushToService: vi.fn(),
      },
    };
      return { ...mocked, default: mocked };
    });

const services = actionsMock.createServices();
const mockedLogger: Mocked<Logger> = loggerMock.create();

describe('ServiceNow', () => {
  const config = { apiUrl: 'https://instance.com' };
  const secrets = { username: 'username', password: 'password' };
  const params = {
    subAction: 'pushToService',
    subActionParams: {
      incident: {
        short_description: 'An incident',
        description: 'This is serious',
      },
    },
  };

  beforeEach(() => {
    (api.pushToService as Mock).mockResolvedValue({ id: 'some-id' });
  });

  describe('ServiceNow SIR', () => {
    let connectorType: ServiceNowConnectorType<ServiceNowPublicConfigurationType, ExecutorParams>;

    beforeAll(() => {
      connectorType = getServiceNowSIRConnectorType();
    });

    describe('execute()', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('it pass the correct comment field key', async () => {
        const actionId = 'some-action-id';
        const executorOptions = {
          actionId,
          config,
          secrets,
          params,
          services,
          logger: mockedLogger,
        } as unknown as ServiceNowConnectorTypeExecutorOptions<
          ServiceNowPublicConfigurationType,
          ExecutorParams
        >;
        await connectorType.executor(executorOptions);
        expect((api.pushToService as Mock).mock.calls[0][0].commentFieldKey).toBe(
          'work_notes'
        );
      });

      test('calls getIncident sub action correctly', async () => {
        const actionId = 'some-action-id';
        const executorOptions = {
          actionId,
          config,
          secrets,
          params: {
            subAction: 'getIncident',
            subActionParams: {
              externalId: 'incident-1',
            },
          },
          services,
          logger: mockedLogger,
        } as unknown as ServiceNowConnectorTypeExecutorOptions<
          ServiceNowPublicConfigurationType,
          ExecutorParams
        >;
        await connectorType.executor(executorOptions);
        expect((api.getIncident as Mock).mock.calls[0][0].params.externalId).toBe(
          'incident-1'
        );
      });
    });
  });
});
