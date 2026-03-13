/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import { loggerMock } from '@kbn/logging-mocks';
import { ActionTypeRegistry } from '../../../../action_type_registry';
import { ActionsClient } from '../../../../actions_client/actions_client';
import { ActionExecutor, TaskRunnerFactory } from '../../../../lib';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsConfigMock } from '../../../../actions_config.mock';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import {
  httpServerMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { SavedObject } from '@kbn/core/server';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { inMemoryMetricsMock } from '../../../../monitoring/in_memory_metrics.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { ConnectorRateLimiter } from '../../../../lib/connector_rate_limiter';
import { getConnectorType } from '../../../../fixtures';
import { createMockInMemoryConnector } from '../../mocks';

const defaultConnectorTypeId = '.connector-type-id';
const defaultConnectorId = 'connector-id';
const inMemoryConnectorTypeId = '.in-memory-type-id';
const inMemoryConnectorId = 'in-memory-id';

const kibanaIndices = ['.kibana'];
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const actionExecutor = actionExecutorMock.create();
const authorization = actionsAuthorizationMock.create();
const bulkExecutionEnqueuer = jest.fn();
const request = httpServerMock.createKibanaRequest();
const auditLogger = auditLoggerMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const taskManager = taskManagerMock.createSetup();
const eventLogClient = eventLogClientMock.create();
const getEventLogClient = jest.fn();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const getAxiosInstanceWithAuth = jest.fn();
const isESOCanEncrypt = true;
const licenseState = licenseStateMock.create();
const licensing = licensingMock.createSetup();
const logger = loggerMock.create();
const connectorTokenClient = connectorTokenClientMock.create();
const inMemoryMetrics = inMemoryMetricsMock.create();

let actionsClient: ActionsClient;
let actionTypeRegistry: ActionTypeRegistry;

const actionTypeIdFromSavedObjectMock = (actionTypeId = defaultConnectorTypeId) => {
  return {
    attributes: {
      actionTypeId,
    },
  } as SavedObject;
};

const connectorSavedObject = {
  id: defaultConnectorId,
  type: 'action',
  attributes: {
    name: '1',
    actionTypeId: 'test',
    config: {
      bar: true,
    },
    secrets: {
      foobar: true,
    },
    isMissingSecrets: false,
  },
  references: [],
};

const inMemoryConnectors = [
  createMockInMemoryConnector({
    id: inMemoryConnectorId,
    actionTypeId: inMemoryConnectorTypeId,
    isPreconfigured: true,
    secrets: {
      foobar: true,
    },
  }),
];

describe('getAxiosInstance()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    actionTypeRegistry = new ActionTypeRegistry({
      licensing,
      taskManager,
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({
          isESOCanEncrypt,
          connectorRateLimiter: new ConnectorRateLimiter({
            config: { email: { limit: 100, lookbackWindow: '1m' } },
          }),
        }),
        inMemoryMetrics
      ),
      actionsConfigUtils: actionsConfigMock.create(),
      licenseState,
      inMemoryConnectors,
    });
    actionTypeRegistry.register(
      getConnectorType({
        id: defaultConnectorTypeId,
        isSystemActionType: true,
        supportedFeatureIds: ['workflows'],
        globalAuthHeaders: { foo: 'bar' },
        validate: {
          config: { schema: z.object({}) },
          secrets: { schema: z.object({ foobar: z.boolean() }) },
        },
        executor: undefined,
      })
    );
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
      connectorSavedObject
    );
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors,
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      auditLogger,
      usageCounter: mockUsageCounter,
      connectorTokenClient,
      getEventLogClient,
      encryptedSavedObjectsClient,
      isESOCanEncrypt,
      getAxiosInstanceWithAuth,
    });
    getEventLogClient.mockResolvedValue(eventLogClient);
  });

  it('calls getAxiosInstanceWithAuth with the correct params', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());
    await actionsClient.getAxiosInstance(defaultConnectorId);
    expect(getAxiosInstanceWithAuth).toHaveBeenCalledWith({
      connectorId: defaultConnectorId,
      connectorTokenClient,
      secrets: { foobar: true },
      additionalHeaders: { foo: 'bar' },
    });
  });

  describe('inMemoryConnectors', () => {
    it('calls the getAxiosInstanceWithAuth with the connector secrets for preconfigured inMemoryConnectors', async () => {
      actionTypeRegistry.register(
        getConnectorType({
          id: inMemoryConnectorTypeId,
          supportedFeatureIds: ['workflows'],
          validate: {
            config: { schema: z.object({}) },
            secrets: { schema: z.object({ foobar: z.boolean() }) },
          },
          executor: undefined,
        })
      );
      await actionsClient.getAxiosInstance(inMemoryConnectorId);
      expect(getAxiosInstanceWithAuth).toHaveBeenCalledWith({
        connectorId: inMemoryConnectorId,
        connectorTokenClient,
        secrets: { foobar: true },
      });
    });

    it('calls the getAxiosInstanceWithAuth with the connector secrets for system action inMemoryConnectors', async () => {
      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        inMemoryConnectors: [
          createMockInMemoryConnector({
            id: inMemoryConnectorId,
            actionTypeId: inMemoryConnectorTypeId,
            isSystemAction: true, // TESTING THIS
            secrets: {
              foobar: true,
            },
          }),
        ],
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        auditLogger,
        usageCounter: mockUsageCounter,
        connectorTokenClient,
        getEventLogClient,
        encryptedSavedObjectsClient,
        isESOCanEncrypt,
        getAxiosInstanceWithAuth,
      });

      actionTypeRegistry.register(
        getConnectorType({
          id: inMemoryConnectorTypeId,
          supportedFeatureIds: ['workflows'],
          validate: {
            config: { schema: z.object({}) },
            secrets: { schema: z.object({ foobar: z.boolean() }) },
          },
          executor: undefined,
        })
      );
      await actionsClient.getAxiosInstance(inMemoryConnectorId);
      expect(getAxiosInstanceWithAuth).toHaveBeenCalledWith({
        connectorId: inMemoryConnectorId,
        connectorTokenClient,
        secrets: { foobar: true },
      });
    });
  });

  describe('authorization', () => {
    it('ensures user is authorised to get an axios instance for execution', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());
      await actionsClient.getAxiosInstance(defaultConnectorId);
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: defaultConnectorTypeId,
        operation: 'execute',
        additionalPrivileges: [],
      });
    });

    it('throws when user is not authorised to get an axios instance for execution', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to execute all actions`)
      );

      await expect(
        actionsClient.getAxiosInstance(defaultConnectorId)
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to execute all actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: defaultConnectorTypeId,
        operation: 'execute',
        additionalPrivileges: [],
      });
    });

    it('ensures that system actions privileges are being authorized correctly', async () => {
      const newActionTypeId = '.foobar';
      actionTypeRegistry.register(
        getConnectorType({
          id: newActionTypeId,
          supportedFeatureIds: ['workflows'],
          getKibanaPrivileges: () => ['test/other'],
          isSystemActionType: true,
          validate: {
            config: { schema: z.object({}) },
            secrets: { schema: z.object({ foobar: z.boolean() }) },
          },
          executor: undefined,
        })
      );
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(
        actionTypeIdFromSavedObjectMock(newActionTypeId)
      );

      await actionsClient.getAxiosInstance(defaultConnectorId);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: newActionTypeId,
        operation: 'execute',
        additionalPrivileges: ['test/other'],
      });
    });
  });

  describe('validation', () => {
    it('fails validation if secrets schema does not match saved values', async () => {
      const newActionTypeId = '.validate-secrets';
      actionTypeRegistry.register(
        getConnectorType({
          id: newActionTypeId,
          supportedFeatureIds: ['workflows'],
          validate: {
            config: { schema: z.object({}) },
            secrets: { schema: z.object({ foobar: z.string() }) },
          },
          executor: undefined,
        })
      );

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(
        actionTypeIdFromSavedObjectMock(newActionTypeId)
      );
      await expect(actionsClient.getAxiosInstance(defaultConnectorId)).rejects
        .toMatchInlineSnapshot(`
        [Error: error validating connector type secrets: ✖ Invalid input: expected string, received boolean
          → at foobar]
      `);
    });

    it('fails validation if the connector is not exclusive to workflows', async () => {
      const newActionTypeId = '.validate-secrets';
      actionTypeRegistry.register(
        getConnectorType({
          id: newActionTypeId,
          validate: {
            config: { schema: z.object({}) },
            secrets: { schema: z.object({ foobar: z.string() }) },
            params: { schema: z.object({}) },
          },
        })
      );

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(
        actionTypeIdFromSavedObjectMock(newActionTypeId)
      );
      await expect(
        actionsClient.getAxiosInstance(defaultConnectorId)
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unable to get axios instance for .validate-secrets. This function is exclusive for workflows-only connectors.]`
      );
    });
  });
});
