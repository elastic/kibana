/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import {
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointMachine,
  MicrosoftDefenderEndpointMachineAction,
  MicrosoftDefenderEndpointSecrets,
} from '../../../common/microsoft_defender_endpoint/types';
import { MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID } from '../../../common/microsoft_defender_endpoint/constants';
import { MicrosoftDefenderEndpointConnector } from './microsoft_defender_endpoint';
import {
  ConnectorInstanceMock,
  createAxiosResponseMock,
  createConnectorInstanceMock,
} from '../lib/mocks';

export interface CreateMicrosoftDefenderConnectorMockResponse {
  options: ServiceParams<MicrosoftDefenderEndpointConfig, MicrosoftDefenderEndpointSecrets>;
  apiMock: { [msApiRoute: string]: (...args: any) => any | Promise<any> };
  instanceMock: ConnectorInstanceMock<MicrosoftDefenderEndpointConnector>;
  usageCollector: ConnectorUsageCollector;
}

const createMicrosoftDefenderConnectorMock = (): CreateMicrosoftDefenderConnectorMockResponse => {
  const apiUrl = 'https://api.mock__microsoft.com';
  const options: CreateMicrosoftDefenderConnectorMockResponse['options'] = {
    configurationUtilities: actionsConfigMock.create(),
    connector: { id: '1', type: MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID },
    config: {
      clientId: 'app-1-2-3',
      tenantId: 'tenant_elastic',
      oAuthServerUrl: 'https://auth.mock__microsoft.com',
      oAuthScope: 'https://securitycenter.onmicrosoft.com/windowsatpservice/.default',
      apiUrl,
    },
    secrets: { clientSecret: 'shhhh-secret' },
    logger: loggingSystemMock.createLogger(),
    services: actionsMock.createServices(),
  };
  const instanceMock = createConnectorInstanceMock(MicrosoftDefenderEndpointConnector, options);

  // Default MS API response mocks. These (or additional ones) can always be defined directly in test
  const apiMock: CreateMicrosoftDefenderConnectorMockResponse['apiMock'] = {
    [`${options.config.oAuthServerUrl}/${options.config.tenantId}/oauth2/v2.0/token`]: () => {
      return createAxiosResponseMock({
        token_type: 'Bearer',
        expires_in: 3599,
        access_token: 'eyJN_token_JIE',
      });
    },

    // Agent Details
    [`${apiUrl}/api/machines/1-2-3`]: () => createAxiosResponseMock(createMicrosoftMachineMock()),

    // Isolate
    [`${apiUrl}/api/machines/1-2-3/isolate`]: () =>
      createAxiosResponseMock(createMicrosoftMachineAction()),

    // Release
    [`${apiUrl}/api/machines/1-2-3/unisolate`]: () =>
      createAxiosResponseMock(createMicrosoftMachineAction()),

    // Machine Actions
    [`${apiUrl}/api/machineactions`]: () =>
      createAxiosResponseMock({
        '@odata.context':
          'https://api-us3.securitycenter.microsoft.com/api/$metadata#MachineActions',
        '@odata.count': 1,
        value: [createMicrosoftMachineAction()],
      }),

    // Machine List
    [`${apiUrl}/api/machines`]: () =>
      createAxiosResponseMock({
        '@odata.context': 'https://api-us3.securitycenter.microsoft.com/api/$metadata#Machines',
        '@odata.count': 1,
        value: [createMicrosoftMachineMock()],
      }),
  };

  instanceMock.request.mockImplementation(
    async (
      ...args: Parameters<ConnectorInstanceMock<MicrosoftDefenderEndpointConnector>['request']>
    ) => {
      const url = args[0].url;

      if (apiMock[url]) {
        return apiMock[url](...args);
      }

      throw new Error(`API mock for [${url}] not implemented!!`);
    }
  );

  return {
    options,
    apiMock,
    instanceMock,
    usageCollector: new ConnectorUsageCollector({
      logger: options.logger,
      connectorId: 'test-connector-id',
    }),
  };
};

const createMicrosoftMachineMock = (
  overrides: Partial<MicrosoftDefenderEndpointMachine> = {}
): MicrosoftDefenderEndpointMachine => {
  return {
    id: '1-2-3',
    computerDnsName: 'mymachine1.contoso.com',
    firstSeen: '2018-08-02T14:55:03.7791856Z',
    lastSeen: '2018-08-02T14:55:03.7791856Z',
    osPlatform: 'Windows1',
    version: '1709',
    osProcessor: 'x64',
    lastIpAddress: '172.17.230.209',
    lastExternalIpAddress: '167.220.196.71',
    osBuild: 18209,
    healthStatus: 'Active',
    rbacGroupId: '140',
    rbacGroupName: 'The-A-Team',
    riskScore: 'Low',
    exposureLevel: 'Medium',
    aadDeviceId: '80fe8ff8-2624-418e-9591-41f0491218f9',
    machineTags: ['test tag 1', 'test tag 2'],
    onboardingstatus: 'foo',
    ipAddresses: [
      { ipAddress: '1.1.1.1', macAddress: '23:a2:5t', type: '', operationalStatus: '' },
    ],
    osArchitecture: '',

    ...overrides,
  };
};

const createMicrosoftMachineAction = (
  overrides: Partial<MicrosoftDefenderEndpointMachineAction> = {}
): MicrosoftDefenderEndpointMachineAction => {
  return {
    id: '5382f7ea-7557-4ab7-9782-d50480024a4e',
    type: 'Isolate',
    scope: 'Selective',
    requestor: 'Analyst@TestPrd.onmicrosoft.com',
    requestorComment: 'test for docs',
    requestSource: '',
    status: 'Succeeded',
    machineId: '1-2-3',
    computerDnsName: 'desktop-test',
    creationDateTimeUtc: '2019-01-02T14:39:38.2262283Z',
    lastUpdateDateTimeUtc: '2019-01-02T14:40:44.6596267Z',
    externalID: 'abc',
    commands: ['RunScript'],
    cancellationRequestor: '',
    cancellationComment: '',
    cancellationDateTimeUtc: '',
    title: '',

    ...overrides,
  };
};

export const microsoftDefenderEndpointConnectorMocks = Object.freeze({
  createAxiosResponseMock,
  create: createMicrosoftDefenderConnectorMock,
  createMachineMock: createMicrosoftMachineMock,
  createMachineActionMock: createMicrosoftMachineAction,
});
