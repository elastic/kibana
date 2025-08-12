/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, securityServiceMock } from '@kbn/core/server/mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { AlertDeletionClient } from './alert_deletion_client';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server/spaces_service';

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

describe('AlertDeletionClient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    logger.get.mockImplementation(() => logger);
    getAlertIndicesAliasMock.mockReturnValue(['index1', 'index2']);
    // @ts-ignore - incomplete return type
    securityServiceStart.authc.getCurrentUser.mockReturnValue({ username: 'test_user' });
  });

  describe('constructor', () => {
    test('should register alert deletion task type', async () => {
      new AlertDeletionClient({
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
      expect(taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith({
        'alert-deletion': {
          title: 'Alert deletion task',
          maxAttempts: 1,
          createTaskRunner: expect.any(Function),
        },
      });
    });
  });
});
