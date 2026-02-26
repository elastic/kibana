/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import type { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { WriteOperations } from '../../authorization';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { MAX_RULES_NUMBER_FOR_BULK_OPERATION } from '../common/constants';
import type { KueryNode } from '@kbn/es-query';
import { checkAuthorizationAndGetTotal } from './check_authorization_and_get_total';
import type { RulesClientContext } from '../types';

const logger = loggingSystemMock.create().get();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const authorization = alertingAuthorizationMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const auditLogger = auditLoggerMock.create();

const context: RulesClientContext = {
  logger,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  ruleTypeRegistry,
  spaceId: 'default',
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion: 'v8.0.0',
  auditLogger,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  minimumScheduleIntervalInMs: 60000,
  fieldsToExcludeFromPublicApi: [],
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  isSystemAction: jest.fn(),
} as unknown as RulesClientContext;

const defaultFindResponse = {
  aggregations: {
    alertTypeId: {
      buckets: [{ key: ['myType', 'myApp'], key_as_string: 'myType|myApp', doc_count: 1 }],
    },
  },
  saved_objects: [],
  per_page: 0,
  page: 1,
  total: 1,
};

describe('checkAuthorizationAndGetTotal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    unsecuredSavedObjectsClient.find.mockResolvedValue(defaultFindResponse);
    authorization.bulkEnsureAuthorized.mockResolvedValue(undefined);
  });

  it('calls find and bulkEnsureAuthorized with correct params', async () => {
    const action = 'DELETE' as const;
    const operation = WriteOperations.BulkDelete;
    const filter = { type: 'function', function: 'is', arguments: [] } as KueryNode;
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      aggregations: {
        alertTypeId: {
          buckets: [
            { key: ['ruleType1', 'consumerA'], key_as_string: 'ruleType1|consumerA', doc_count: 1 },
            { key: ['ruleType2', 'consumerB'], key_as_string: 'ruleType2|consumerB', doc_count: 2 },
          ],
        },
      },
      saved_objects: [],
      per_page: 0,
      page: 1,
      total: 3,
    });

    const result = await checkAuthorizationAndGetTotal(context, { filter, action });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      filter,
      page: 1,
      perPage: 0,
      type: RULE_SAVED_OBJECT_TYPE,
      aggs: {
        alertTypeId: {
          multi_terms: {
            terms: [
              { field: 'alert.attributes.alertTypeId' },
              { field: 'alert.attributes.consumer' },
            ],
          },
        },
      },
    });

    expect(authorization.bulkEnsureAuthorized).toHaveBeenCalledTimes(1);
    expect(authorization.bulkEnsureAuthorized).toHaveBeenCalledWith({
      ruleTypeIdConsumersPairs: [
        { ruleTypeId: 'ruleType1', consumers: ['consumerA'] },
        { ruleTypeId: 'ruleType2', consumers: ['consumerB'] },
      ],
      operation,
      entity: 'rule',
    });

    expect(result).toEqual({ total: 3 });
  });

  describe('error handling', () => {
    it('throws when no rules returned from find', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        aggregations: { alertTypeId: { buckets: [] } },
        saved_objects: [],
        per_page: 0,
        page: 1,
        total: 0,
      });

      await expect(
        checkAuthorizationAndGetTotal(context, { filter: null, action: 'GET' })
      ).rejects.toThrow(`No rules found for bulk get`);
      expect(authorization.bulkEnsureAuthorized).not.toHaveBeenCalled();
    });

    it('throws when rules found exceed MAX_RULES_NUMBER_FOR_BULK_OPERATION', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        ...defaultFindResponse,
        total: MAX_RULES_NUMBER_FOR_BULK_OPERATION + 1,
      });

      await expect(
        checkAuthorizationAndGetTotal(context, { filter: null, action: 'BULK_EDIT' })
      ).rejects.toThrow(
        `More than ${MAX_RULES_NUMBER_FOR_BULK_OPERATION} rules matched for bulk edit`
      );
    });

    it('throws and logs audit event when bulkEnsureAuthorized throws', async () => {
      ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementation(() => {});
      const authError = new Error('Unauthorized');
      authorization.bulkEnsureAuthorized.mockRejectedValue(authError);

      await expect(
        checkAuthorizationAndGetTotal(context, { filter: null, action: 'ENABLE' })
      ).rejects.toThrow('Unauthorized');

      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_enable',
            outcome: 'failure',
          }),
        })
      );
    });
  });
});
