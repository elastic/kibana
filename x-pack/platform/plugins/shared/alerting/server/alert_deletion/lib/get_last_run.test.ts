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
import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server/spaces_service';

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
  getSavedObjectsClient: jest.fn(),
} as unknown as KibanaRequest;

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

describe('getLastRun', () => {
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

  test('should return last run time if available', async () => {
    getSpaceId.mockReturnValueOnce('space1');
    esClient.search.mockResolvedValueOnce({
      took: 10,
      timed_out: false,
      _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      hits: {
        total: { relation: 'eq', value: 1 },
        hits: [
          {
            _id: '123',
            _index: '.kibana-event-log',
            _source: {
              '@timestamp': '2025-03-25T15:20:44.704Z',
              event: {
                provider: 'alerting',
                action: 'delete-alerts',
                outcome: 'success',
                start: '2025-03-25T15:20:44.704Z',
                end: '2025-03-25T15:20:44.764Z',
                duration: '60000000',
              },
              message: 'Alert deletion task deleted 1 alerts',
              kibana: {
                alert: {
                  deletion: {
                    num_deleted: 1,
                  },
                },
                space_ids: ['space1'],
                server_uuid: '00000000-2785-441b-ae8c-186a1936b17d',
                version: '9.1.0',
              },
              ecs: {
                version: '1.8.0',
              },
            },
          },
        ],
      },
    });

    const lastRunDate = await alertDeletionClient.getLastRun(fakeRequest);

    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana-event-log*',
      query: {
        bool: {
          filter: [
            { term: { 'event.action': 'delete-alerts' } },
            { term: { 'event.provider': 'alerting' } },
            { term: { 'kibana.space_ids': 'space1' } },
          ],
        },
      },
      size: 1,
      sort: [{ [TIMESTAMP]: 'desc' }],
    });
    expect(lastRunDate).toEqual('2025-03-25T15:20:44.704Z');
  });

  test('should return undefined if not available', async () => {
    getSpaceId.mockReturnValueOnce('default');
    esClient.search.mockResolvedValueOnce({
      took: 10,
      timed_out: false,
      _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      hits: {
        total: { relation: 'eq', value: 0 },
        hits: [],
      },
    });

    const lastRunDate = await alertDeletionClient.getLastRun(fakeRequest);

    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana-event-log*',
      query: {
        bool: {
          filter: [
            { term: { 'event.action': 'delete-alerts' } },
            { term: { 'event.provider': 'alerting' } },
            { term: { 'kibana.space_ids': 'default' } },
          ],
        },
      },
      size: 1,
      sort: [{ [TIMESTAMP]: 'desc' }],
    });
    expect(lastRunDate).toBeUndefined();
  });

  test('logs and returns undefined if search errors', async () => {
    getSpaceId.mockReturnValueOnce('default');
    esClient.search.mockImplementationOnce(() => {
      throw new Error('search failed');
    });

    await alertDeletionClient.getLastRun(fakeRequest);

    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana-event-log*',
      query: {
        bool: {
          filter: [
            { term: { 'event.action': 'delete-alerts' } },
            { term: { 'event.provider': 'alerting' } },
            { term: { 'kibana.space_ids': 'default' } },
          ],
        },
      },
      size: 1,
      sort: [{ [TIMESTAMP]: 'desc' }],
    });
    expect(logger.error).toHaveBeenCalledWith('Error getting last run date: search failed');
  });
});
