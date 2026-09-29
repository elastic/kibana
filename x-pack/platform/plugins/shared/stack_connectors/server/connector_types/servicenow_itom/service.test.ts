/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import axios from 'axios';

import { createExternalService } from './service';
import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import type { ExternalServiceITOM } from '../lib/servicenow/types';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { snExternalServiceConfig } from '../lib/servicenow/config';
import { itomEventParams, serviceNowChoices } from '../lib/servicenow/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';

const logger = loggingSystemMock.create().get() as Mocked<Logger>;

vi.mock('axios');
vi.mock('@kbn/actions-plugin/server/lib/axios_utils', async () => {
  const originalUtils = (await vi.importActual('@kbn/actions-plugin/server/lib/axios_utils'));
  return {
    ...originalUtils,
    request: vi.fn(),
  };
});

axios.create = vi.fn(() => axios);
const requestMock = utils.request as Mock;
const configurationUtilities = actionsConfigMock.create();

describe('ServiceNow SIR service', () => {
  let service: ExternalServiceITOM;
  let connectorUsageCollector: ConnectorUsageCollector;

  beforeEach(() => {
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
    service = createExternalService({
      credentials: {
        config: { apiUrl: 'https://example.com/', isOAuth: false },
        secrets: { username: 'admin', password: 'admin' },
      },
      logger,
      configurationUtilities,
      serviceConfig: snExternalServiceConfig['.servicenow-itom'],
      axiosInstance: axios,
      connectorUsageCollector,
    }) as ExternalServiceITOM;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addEvent', () => {
    test('it adds an event', async () => {
      requestMock.mockImplementationOnce(() => ({
        data: {
          result: {
            'Default Bulk Endpoint': '1 events were inserted',
          },
        },
      }));

      await service.addEvent(itomEventParams);
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://example.com/api/global/em/jsonv2',
        method: 'post',
        data: { records: [itomEventParams] },
        connectorUsageCollector,
      });
    });

    test('wraps errors with the structured context suffix', async () => {
      requestMock.mockImplementationOnce(() => {
        const err = Object.assign(new Error('forbidden'), {
          isAxiosError: true as const,
          response: { status: 403, data: { error: { message: 'denied', detail: 'no access' } } },
        });
        throw err;
      });

      await expect(service.addEvent(itomEventParams)).rejects.toThrow(
        /\[status=403\] \[method=post\] \[endpoint=event\]$/
      );
    });
  });

  describe('getChoices', () => {
    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: serviceNowChoices },
      }));
      await service.getChoices(['severity']);

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://example.com/api/now/table/sys_choice?sysparm_query=name=task^ORname=em_event^element=severity^language=en&sysparm_fields=label,value,dependent_value,element',
        connectorUsageCollector,
      });
    });
  });
});
