/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from '@kbn/utility-types';
import { merge } from 'lodash';
import { AxiosResponse } from 'axios/index';
import {
  ServiceParams,
  SubActionRequestParams,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { Readable } from 'stream';
import { createAxiosResponseMock } from '../lib/mocks';
import { SENTINELONE_CONNECTOR_ID } from '../../../common/sentinelone/constants';
import { SentinelOneConnector } from './sentinelone';
import {
  SentinelOneConfig,
  SentinelOneFetchAgentFilesResponse,
  SentinelOneGetAgentsResponse,
  SentinelOneGetRemoteScriptResults,
  SentinelOneSecrets,
} from '../../../common/sentinelone/types';

const createAgentDetailsMock = (
  overrides: DeepPartial<SentinelOneGetAgentsResponse['data'][number]> = {}
): SentinelOneGetAgentsResponse['data'][number] => {
  const details: SentinelOneGetAgentsResponse['data'][number] = {
    accountId: '1392053568574369781',
    accountName: 'Elastic',
    activeThreats: 0,
    agentVersion: '23.4.2.14',
    allowRemoteShell: true,
    appsVulnerabilityStatus: 'not_applicable',
    cloudProviders: {},
    computerName: 'host-sentinelone-1371',
    consoleMigrationStatus: 'N/A',
    coreCount: 1,
    cpuCount: 1,
    cpuId: 'ARM Cortex-A72',
    createdAt: '2024-03-25T16:59:14.866785Z',
    groupUpdatedAt: '2024-03-25T16:59:14.866785Z',
    policyUpdatedAt: '2024-03-25T16:59:14.866785Z',
    activeDirectory: {
      computerDistinguishedName: null,
      computerMemberOf: [],
      lastUserDistinguishedName: null,
      lastUserMemberOf: [],
      userPrincipalName: 'foo',
      mail: null,
    },
    detectionState: null,
    domain: 'unknown',
    encryptedApplications: false,
    externalId: '',
    externalIp: '108.77.84.191',
    firewallEnabled: true,
    firstFullModeTime: null,
    fullDiskScanLastUpdatedAt: '2024-03-25T17:21:43.371381Z',
    groupId: '1392053568591146999',
    groupIp: '108.77.84.x',
    groupName: 'Default Group',
    id: '1913920934584665209',
    inRemoteShellSession: false,
    infected: false,
    installerType: '.deb',
    isActive: true,
    isDecommissioned: false,
    isPendingUninstall: false,
    isUninstalled: false,
    isUpToDate: true,
    lastActiveDate: '2024-04-11T14:59:50.260336Z',
    lastIpToMgmt: '192.168.64.2',
    lastLoggedInUserName: '',
    licenseKey: '',
    locationEnabled: false,
    locationType: 'not_supported',
    locations: null,
    machineType: 'server',
    mitigationMode: 'protect',
    mitigationModeSuspicious: 'detect',
    modelName: 'QEMU QEMU Virtual Machine',
    networkInterfaces: [
      {
        gatewayIp: '192.168.64.1',
        gatewayMacAddress: 'be:d0:74:50:d8:64',
        id: '1913920934593053818',
        inet: ['192.168.64.2'],
        inet6: ['fdf4:f033:b1d4:8c51:5054:ff:fe5b:15e7'],
        name: 'enp0s1',
        physical: '52:54:00:5B:15:E7',
      },
    ],
    networkQuarantineEnabled: false,
    networkStatus: 'connected',
    operationalState: 'na',
    operationalStateExpiration: null,
    osArch: '64 bit',
    osName: 'Linux',
    osRevision: 'Ubuntu 22.04.4 LTS 5.15.0-101-generic',
    osStartTime: '2024-03-27T07:32:46Z',
    osType: 'linux',
    osUsername: 'root',
    rangerStatus: 'Enabled',
    rangerVersion: '23.4.1.1',
    registeredAt: '2024-03-25T16:59:14.860010Z',
    remoteProfilingState: 'disabled',
    remoteProfilingStateExpiration: null,
    scanAbortedAt: null,
    scanFinishedAt: '2024-03-25T17:21:43.371381Z',
    scanStartedAt: '2024-03-25T17:00:19.774123Z',
    scanStatus: 'finished',
    serialNumber: null,
    showAlertIcon: false,
    siteId: '1392053568582758390',
    siteName: 'Default site',
    storageName: null,
    storageType: null,
    tags: { sentinelone: [] },
    threatRebootRequired: false,
    totalMemory: 1966,
    updatedAt: '2024-04-10T18:50:13.238352Z',
    userActionsNeeded: [],
    uuid: 'c06d63d9-9fa2-046d-e91e-dc94cf6695d8',
  };

  return merge(details, overrides);
};

const createRemoteScriptResultsMock = (): SentinelOneGetRemoteScriptResults => {
  return {
    download_links: [
      {
        downloadUrl: 'https://remote/script/results/download',
        fileName: 'some_file_name',
        taskId: 'task-123',
      },
    ],
  };
};

const createGetAgentsApiResponseMock = (): SentinelOneGetAgentsResponse => {
  return {
    pagination: {
      totalItems: 1,
      nextCursor: 'after-1',
    },
    errors: null,
    data: [createAgentDetailsMock()],
  };
};

class SentinelOneConnectorTestClass extends SentinelOneConnector {
  // Defined details API responses for SentinelOne. These can be manipulated by the tests to mock specific results
  public mockResponses = {
    getAgentsApiResponse: createGetAgentsApiResponseMock(),
    fetchAgentFilesApiResponse: {
      errors: null,
      data: { success: true },
    } as SentinelOneFetchAgentFilesResponse,
    downloadAgentFileApiResponse: Readable.from(['test']),
    getRemoteScriptResults: {
      data: createRemoteScriptResultsMock(),
    },
    downloadRemoteScriptResults: Readable.from(['test']),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public requestSpy = jest.fn(async ({ url }: SubActionRequestParams<any>) => {
    const response = createAxiosResponseMock({});

    // Mocks some SentinelOne API responses
    if (url.endsWith('/agents')) {
      response.data = this.mockResponses.getAgentsApiResponse;
    } else if (url.endsWith('/actions/fetch-files')) {
      return sentinelOneConnectorMocks.createAxiosResponse(
        this.mockResponses.fetchAgentFilesApiResponse
      );
    } else if (/\/uploads\/.*$/.test(url)) {
      return sentinelOneConnectorMocks.createAxiosResponse(
        this.mockResponses.downloadAgentFileApiResponse
      );
    } else if (/remote-scripts\/fetch-files/.test(url)) {
      return sentinelOneConnectorMocks.createAxiosResponse(
        this.mockResponses.getRemoteScriptResults
      );
    } else if (/remote\/script\/results\/download/.test(url)) {
      return sentinelOneConnectorMocks.createAxiosResponse(
        this.mockResponses.downloadRemoteScriptResults
      );
    }

    return response;
  });

  constructor(
    public readonly constructorParams: ServiceParams<SentinelOneConfig, SentinelOneSecrets>
  ) {
    super(constructorParams);
  }

  protected async request<R>(params: SubActionRequestParams<R>): Promise<AxiosResponse<R>> {
    return this.requestSpy(params) as Promise<AxiosResponse<R>>;
  }
}

const createSentinelOneTestInstance = (): SentinelOneConnectorTestClass => {
  return new SentinelOneConnectorTestClass({
    configurationUtilities: actionsConfigMock.create(),
    connector: { id: '1', type: SENTINELONE_CONNECTOR_ID },
    config: {
      url: 'https://mock-sentinelone-api-server.com',
    },
    secrets: { token: 'token-abc' },
    logger: loggingSystemMock.createLogger(),
    services: actionsMock.createServices(),
  });
};

export const sentinelOneConnectorMocks = Object.freeze({
  create: createSentinelOneTestInstance,
  createAxiosResponse: createAxiosResponseMock,
  createGetAgentsApiResponse: createGetAgentsApiResponseMock,
  createAgentDetails: createAgentDetailsMock,
  createRemoteScriptResults: createRemoteScriptResultsMock,
});
