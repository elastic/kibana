/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, securityServiceMock } from '@kbn/core/server/mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { AlertDeletionClient } from '../alert_deletion_client';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server/spaces_service';
import { activeAlertsQuery, inactiveAlertsQuery } from './test_utils';

const auditService = securityServiceMock.createStart().audit;
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const eventLogger = eventLoggerMock.create();
const getAlertIndicesAliasMock = jest.fn();
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const securityServiceStart = securityServiceMock.createStart();
const getSpaceId = jest.fn();
const spacesService = { getSpaceId } as unknown as SpacesServiceStart;
const taskManagerSetup = taskManagerMock.createSetup();
const taskManagerStart = taskManagerMock.createStart();

describe('previewTask', () => {
  let alertDeletionClient: AlertDeletionClient;

  beforeEach(() => {
    jest.resetAllMocks();
    logger.get.mockImplementation(() => logger);
    getAlertIndicesAliasMock.mockReturnValue(['index1', 'index2']);
    // @ts-ignore - incomplete return type
    securityServiceStart.authc.getCurrentUser.mockReturnValue({ username: 'test_user' });
    alertDeletionClient = new AlertDeletionClient({
      auditService,
      elasticsearchClientPromise: Promise.resolve(esClient),
      eventLogger,
      getAlertIndicesAlias: getAlertIndicesAliasMock,
      logger,
      ruleTypeRegistry,
      securityService: Promise.resolve(securityServiceStart),
      spacesService: Promise.resolve(spacesService),
      taskManagerSetup,
      taskManagerStartPromise: Promise.resolve(taskManagerStart),
    });
  });

  test('should return count of inactive alerts', async () => {
    esClient.count.mockResolvedValue({
      count: 1,
      _shards: { failed: 0, successful: 0, total: 0 },
    });
    const result = await alertDeletionClient.previewTask(
      {
        isActiveAlertDeleteEnabled: false,
        isInactiveAlertDeleteEnabled: true,
        activeAlertDeleteThreshold: 1,
        inactiveAlertDeleteThreshold: 30,
        categoryIds: ['observability', 'management', 'securitySolution'],
      },
      'space-1'
    );

    expect(ruleTypeRegistry.getAllTypesForCategories).toHaveBeenCalledWith([
      'observability',
      'management',
      'securitySolution',
    ]);
    expect(esClient.count).toHaveBeenCalledTimes(1);
    expect(esClient.count).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      allow_no_indices: true,
      ignore_unavailable: true,
      query: inactiveAlertsQuery(),
    });

    expect(result).toEqual(1);
  });

  test('should return count of active alerts', async () => {
    esClient.count.mockResolvedValue({
      count: 3,
      _shards: { failed: 0, successful: 0, total: 0 },
    });
    const result = await alertDeletionClient.previewTask(
      {
        isActiveAlertDeleteEnabled: true,
        isInactiveAlertDeleteEnabled: false,
        activeAlertDeleteThreshold: 45,
        inactiveAlertDeleteThreshold: 1,
        categoryIds: ['observability', 'management', 'securitySolution'],
      },
      'space-1'
    );

    expect(ruleTypeRegistry.getAllTypesForCategories).toHaveBeenCalledWith([
      'observability',
      'management',
      'securitySolution',
    ]);
    expect(ruleTypeRegistry.getAllTypes).not.toHaveBeenCalled();
    expect(esClient.count).toHaveBeenCalledTimes(1);
    expect(esClient.count).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      allow_no_indices: true,
      ignore_unavailable: true,
      query: activeAlertsQuery(),
    });

    expect(result).toEqual(3);
  });

  test('should return count of active and inactive alerts', async () => {
    esClient.count.mockResolvedValueOnce({
      count: 8,
      _shards: { failed: 0, successful: 0, total: 0 },
    });
    esClient.count.mockResolvedValueOnce({
      count: 1,
      _shards: { failed: 0, successful: 0, total: 0 },
    });
    const result = await alertDeletionClient.previewTask(
      {
        isActiveAlertDeleteEnabled: true,
        isInactiveAlertDeleteEnabled: true,
        activeAlertDeleteThreshold: 45,
        inactiveAlertDeleteThreshold: 30,
        categoryIds: ['observability', 'securitySolution', 'management'],
      },
      'space-1'
    );

    expect(esClient.count).toHaveBeenCalledTimes(2);
    expect(esClient.count).toHaveBeenNthCalledWith(1, {
      index: ['index1', 'index2'],
      allow_no_indices: true,
      ignore_unavailable: true,
      query: activeAlertsQuery(),
    });
    expect(esClient.count).toHaveBeenNthCalledWith(2, {
      index: ['index1', 'index2'],
      allow_no_indices: true,
      ignore_unavailable: true,
      query: inactiveAlertsQuery(),
    });

    expect(result).toEqual(9);
  });

  test('should use category IDs if specified', async () => {
    esClient.count.mockResolvedValue({
      count: 1,
      _shards: { failed: 0, successful: 0, total: 0 },
    });
    const result = await alertDeletionClient.previewTask(
      {
        isActiveAlertDeleteEnabled: false,
        isInactiveAlertDeleteEnabled: true,
        activeAlertDeleteThreshold: 1,
        inactiveAlertDeleteThreshold: 30,
        categoryIds: ['observability'],
      },
      'space-1'
    );

    expect(ruleTypeRegistry.getAllTypes).not.toHaveBeenCalled();
    expect(ruleTypeRegistry.getAllTypesForCategories).toHaveBeenCalledWith(['observability']);
    expect(esClient.count).toHaveBeenCalledTimes(1);
    expect(esClient.count).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      allow_no_indices: true,
      ignore_unavailable: true,
      query: inactiveAlertsQuery(),
    });

    expect(result).toEqual(1);
  });

  test('should throw error for invalid category IDs', async () => {
    await expect(
      alertDeletionClient.previewTask(
        {
          isActiveAlertDeleteEnabled: false,
          isInactiveAlertDeleteEnabled: true,
          activeAlertDeleteThreshold: 1,
          inactiveAlertDeleteThreshold: 30,
          // @ts-expect-error invalid category ID
          categoryIds: ['invalid-category', 'management'],
        },
        'space-1'
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid category id - invalid-category,management"`
    );
  });

  test('should throw error if count query throws error', async () => {
    esClient.count.mockRejectedValue(new Error('Fail to count alerts'));
    await expect(
      alertDeletionClient.previewTask(
        {
          isActiveAlertDeleteEnabled: false,
          isInactiveAlertDeleteEnabled: true,
          activeAlertDeleteThreshold: 1,
          inactiveAlertDeleteThreshold: 30,
          categoryIds: ['observability', 'management', 'securitySolution'],
        },
        'space-1'
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail to count alerts"`);

    expect(esClient.count).toHaveBeenCalledTimes(1);
    expect(esClient.count).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      allow_no_indices: true,
      ignore_unavailable: true,
      query: inactiveAlertsQuery(),
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Error determining the number of inactive alerts to delete: Fail to count alerts'
    );
  });
});
