/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, PubSubEvent } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  loggingSystemMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import type { Case } from '../../common/types/domain';
import { ConnectorTypes } from '../../common/types/domain';
import { createCasesClientMock } from '../client/mocks';
import { flattenCaseSavedObject } from '../common/utils';
import { mockCases } from '../mocks';
import type { ExternalIncidentUpdatedData } from './external_incident_topic';
import { externalIncidentUpdatedTopic } from './external_incident_topic';
import {
  EXTERNAL_INCIDENT_CONSUMER,
  registerExternalIncidentConsumer,
  syncCasesForIncident,
} from './external_incident_consumer';
import { EXTERNAL_SYNC_WORKLOAD_TYPE } from './service_account';

const caseOn = (id: string, connectorId: string): Case => ({
  ...flattenCaseSavedObject({ savedObject: mockCases[0] }),
  id,
  connector: { id: connectorId, name: 'Jira', type: ConnectorTypes.jira, fields: null },
});

const event: PubSubEvent<ExternalIncidentUpdatedData> = {
  id: 'event-1',
  topic: externalIncidentUpdatedTopic.name,
  acceptedAt: '2026-10-30T00:00:00.000Z',
  data: { spaceId: 'space-1', connectorId: 'jira-1', externalId: '10001' },
};

describe('syncCasesForIncident', () => {
  const logger = loggingSystemMock.createLogger();
  const serviceAccountRequest = httpServerMock.createKibanaRequest();
  const casesClient = createCasesClientMock();
  const getCasesClient = jest.fn().mockResolvedValue(casesClient);
  let serviceAccounts: ReturnType<typeof securityServiceMock.createServiceAccounts>;

  const run = () => syncCasesForIncident({ event, serviceAccounts, getCasesClient, logger });

  beforeEach(() => {
    jest.clearAllMocks();
    serviceAccounts = securityServiceMock.createServiceAccounts();
    serviceAccounts.isEnabled.mockReturnValue(true);
    serviceAccounts.withScopedRequestForWorkload.mockImplementation(
      async (_params: unknown, fn: (request: KibanaRequest) => Promise<unknown>) =>
        fn(serviceAccountRequest)
    );
    casesClient.cases.findByExternalId.mockResolvedValue([caseOn('case-1', 'jira-1')]);
  });

  it('syncs the cases pushed to the incident as the service account bound to the connector', async () => {
    await run();

    expect(serviceAccounts.withScopedRequestForWorkload).toHaveBeenCalledWith(
      {
        spaceId: 'space-1',
        workloadType: EXTERNAL_SYNC_WORKLOAD_TYPE,
        workloadId: 'jira-1',
        executionId: 'event-1',
      },
      expect.any(Function)
    );
    expect(getCasesClient).toHaveBeenCalledWith(serviceAccountRequest);
    expect(casesClient.cases.findByExternalId).toHaveBeenCalledWith({
      externalId: '10001',
      connectorId: 'jira-1',
    });
    expect(casesClient.cases.sync).toHaveBeenCalledWith({ caseId: 'case-1' });
  });

  it('skips a case whose connector changed after the push', async () => {
    casesClient.cases.findByExternalId.mockResolvedValue([
      caseOn('case-1', 'jira-1'),
      caseOn('case-2', 'servicenow-1'),
    ]);

    await run();

    expect(casesClient.cases.sync).toHaveBeenCalledTimes(1);
    expect(casesClient.cases.sync).toHaveBeenCalledWith({ caseId: 'case-1' });
  });

  it('keeps syncing the other cases when one fails', async () => {
    casesClient.cases.findByExternalId.mockResolvedValue([
      caseOn('case-1', 'jira-1'),
      caseOn('case-2', 'jira-1'),
    ]);
    casesClient.cases.sync.mockRejectedValueOnce(new Error('boom'));

    await run();

    expect(casesClient.cases.sync).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to sync case case-1'));
  });

  it('warns and does nothing when service accounts are disabled', async () => {
    serviceAccounts.isEnabled.mockReturnValue(false);

    await run();

    expect(serviceAccounts.withScopedRequestForWorkload).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('service accounts are not enabled')
    );
  });

  it('warns when no service account is bound to the connector', async () => {
    serviceAccounts.withScopedRequestForWorkload.mockRejectedValue(Boom.notFound());

    await run();

    expect(casesClient.cases.sync).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no service account is bound to the connector')
    );
  });

  it('logs an error when the service account cannot be assumed', async () => {
    serviceAccounts.withScopedRequestForWorkload.mockRejectedValue(Boom.forbidden());

    await run();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to sync the cases of incident 10001')
    );
  });
});

describe('registerExternalIncidentConsumer', () => {
  it('subscribes to the external incident topic', () => {
    const { pubsub } = coreMock.createSetup();

    registerExternalIncidentConsumer({
      pubsub,
      getServices: jest.fn(),
      logger: loggingSystemMock.createLogger(),
    });

    expect(pubsub.subscribe).toHaveBeenCalledWith(externalIncidentUpdatedTopic, {
      consumer: EXTERNAL_INCIDENT_CONSUMER,
      handler: expect.any(Function),
    });
  });
});
