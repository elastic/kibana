/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Case } from '../../../../common/types/domain';
import { createCasesClientMock } from '../../../client/mocks';
import type { CaseError } from '../../../common/error';
import { isCaseError } from '../../../common/error';
import { flattenCaseSavedObject } from '../../../common/utils';
import { externalIncidentUpdatedTopic } from '../../../external_sync/external_incident_topic';
import { createServiceAccountsMock } from '../../../external_sync/mocks';
import { EXTERNAL_SYNC_WORKLOAD_TYPE } from '../../../external_sync/service_account';
import { mockCases } from '../../../mocks';
import type { CasesRequestHandlerContext } from '../../../types';
import { notifyExternalSyncRoute } from './notify_external_sync';

const theCase: Case = flattenCaseSavedObject({ savedObject: mockCases[0] });
const binding = {
  pluginId: 'cases',
  workloadType: EXTERNAL_SYNC_WORKLOAD_TYPE,
  workloadId: 'jira-1',
  serviceAccountId: 'sa-1',
  spaceId: 'space-1',
  boundBy: { type: 'user' as const, username: 'elastic' },
  boundAt: '2026-10-30T00:00:00.000Z',
};

describe('notifyExternalSyncRoute', () => {
  const casesClient = createCasesClientMock();
  const actionsClient = actionsClientMock.create();
  const { pubsub } = coreMock.createStart();
  const serviceAccounts = createServiceAccountsMock();
  const context = {
    cases: Promise.resolve({ getCasesClient: async () => casesClient }),
  } as unknown as CasesRequestHandlerContext;

  const route = notifyExternalSyncRoute({
    getStartServices: async () => ({ pubsub, serviceAccounts }),
    getActionsClient: async () => actionsClient,
    getSpaceId: () => 'space-1',
  });

  const call = (body: Record<string, unknown>) => {
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      params: { connector_id: 'jira-1' },
      body,
    });
    return {
      response,
      result: route.handler({
        context,
        request,
        response,
        logger: loggingSystemMock.createLogger(),
        kibanaVersion: '9.6.0',
        incrementAttachmentTypeCounters: jest.fn(),
      }),
    };
  };

  const jiraBody = { issue: { id: '10001', fields: { updated: '2026-09-30T10:00:00.000+0000' } } };

  beforeEach(() => {
    jest.clearAllMocks();
    actionsClient.get.mockResolvedValue({
      id: 'jira-1',
      actionTypeId: '.jira',
      name: 'Jira',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
    });
    casesClient.cases.findByExternalId.mockResolvedValue([theCase]);
    serviceAccounts.isEnabled.mockReturnValue(true);
    serviceAccounts.getWorkloadBinding.mockResolvedValue(binding);
    pubsub.publish.mockResolvedValue({ id: 'event-1', acceptedAt: '2026-10-30T00:00:01.000Z' });
  });

  it('publishes the incident change and accepts the notification', async () => {
    const { response, result } = call(jiraBody);
    await result;

    expect(casesClient.cases.findByExternalId).toHaveBeenCalledWith({
      externalId: '10001',
      connectorId: 'jira-1',
    });
    expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledWith({
      spaceId: 'space-1',
      workloadType: EXTERNAL_SYNC_WORKLOAD_TYPE,
      workloadId: 'jira-1',
    });
    expect(pubsub.publish).toHaveBeenCalledWith(externalIncidentUpdatedTopic, {
      id: expect.any(String),
      data: {
        spaceId: 'space-1',
        connectorId: 'jira-1',
        externalId: '10001',
        updatedAt: '2026-09-30T10:00:00.000+0000',
      },
    });
    expect(response.accepted).toHaveBeenCalledWith({
      body: { id: 'event-1', accepted_at: '2026-10-30T00:00:01.000Z', cases: 1 },
    });
  });

  it('rejects a body that is not a change of this connector type', async () => {
    const { response, result } = call({ sys_id: 'abc' });
    await result;

    expect(response.badRequest).toHaveBeenCalled();
    expect(pubsub.publish).not.toHaveBeenCalled();
  });

  it('rejects a connector type that cannot send changes', async () => {
    actionsClient.get.mockResolvedValue({
      id: 'jira-1',
      actionTypeId: '.resilient',
      name: 'Resilient',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
    });

    const error = await call(jiraBody).result.catch((e: CaseError) => e);

    expect(isCaseError(error) && error.boomify().output.statusCode).toBe(400);
    expect(pubsub.publish).not.toHaveBeenCalled();
  });

  it('returns not found when no case was pushed to the incident', async () => {
    casesClient.cases.findByExternalId.mockResolvedValue([]);

    const { response, result } = call(jiraBody);
    await result;

    expect(response.notFound).toHaveBeenCalled();
    expect(pubsub.publish).not.toHaveBeenCalled();
  });

  it('returns a conflict when no service account is bound to the connector', async () => {
    serviceAccounts.getWorkloadBinding.mockResolvedValue(null);

    const { response, result } = call(jiraBody);
    await result;

    expect(response.conflict).toHaveBeenCalled();
    expect(pubsub.publish).not.toHaveBeenCalled();
  });

  it('rejects the notification when service accounts are disabled', async () => {
    serviceAccounts.isEnabled.mockReturnValue(false);

    const { response, result } = call(jiraBody);
    await result;

    expect(response.badRequest).toHaveBeenCalled();
    expect(serviceAccounts.getWorkloadBinding).not.toHaveBeenCalled();
  });
});
