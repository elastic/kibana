/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { createMockReportingCore } from '../../../test_helpers';
import {
  transformResponse,
  scheduledQueryFactory,
  CreatedAtSearchResponse,
} from './scheduled_query';
import { ReportingCore } from '../../..';
import { ScheduledReportType } from '../../../types';

const fakeRawRequest = {
  headers: {
    authorization: `ApiKey skdjtq4u543yt3rhewrh`,
  },
  path: '/',
} as unknown as KibanaRequest;

const soResponse: SavedObjectsFindResponse<ScheduledReportType> = {
  page: 1,
  per_page: 10,
  total: 2,
  saved_objects: [
    {
      type: 'scheduled_report',
      id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
      namespaces: ['default'],
      attributes: {
        createdAt: '2025-05-06T21:10:17.137Z',
        createdBy: 'elastic',
        enabled: true,
        jobType: 'printable_pdf_v2',
        meta: {
          isDeprecated: false,
          layout: 'preserve_layout',
          objectType: 'dashboard',
        },
        migrationVersion: '9.1.0',
        title: '[Logs] Web Traffic',
        payload:
          '{"browserTimezone":"America/New_York","layout":{"dimensions":{"height":2220,"width":1364},"id":"preserve_layout"},"objectType":"dashboard","title":"[Logs] Web Traffic","version":"9.1.0","locatorParams":[{"id":"DASHBOARD_APP_LOCATOR","params":{"dashboardId":"edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b","preserveSavedFilters":true,"timeRange":{"from":"now-7d/d","to":"now"},"useHash":false,"viewMode":"view"}}],"isDeprecated":false}',
        schedule: {
          rrule: {
            freq: 3,
            interval: 3,
            byhour: [12],
            byminute: [0],
            tzid: 'UTC',
          },
        },
      },
      references: [],
      managed: false,
      updated_at: '2025-05-06T21:10:17.137Z',
      created_at: '2025-05-06T21:10:17.137Z',
      version: 'WzEsMV0=',
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: '10.1.0',
      score: 0,
    },
    {
      type: 'scheduled_report',
      id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
      namespaces: ['default'],
      attributes: {
        createdAt: '2025-05-06T21:12:06.584Z',
        createdBy: 'elastic',
        enabled: true,
        jobType: 'PNGV2',
        meta: {
          isDeprecated: false,
          layout: 'preserve_layout',
          objectType: 'dashboard',
        },
        migrationVersion: '9.1.0',
        notification: {
          email: {
            to: ['user@elastic.co'],
          },
        },
        title: '[Logs] Web Traffic',
        payload:
          '{"browserTimezone":"America/New_York","layout":{"dimensions":{"height":2220,"width":1364},"id":"preserve_layout"},"objectType":"dashboard","title":"[Logs] Web Traffic","version":"9.1.0","locatorParams":[{"id":"DASHBOARD_APP_LOCATOR","params":{"dashboardId":"edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b","preserveSavedFilters":true,"timeRange":{"from":"now-7d/d","to":"now"},"useHash":false,"viewMode":"view"}}],"isDeprecated":false}',
        schedule: {
          rrule: {
            freq: 1,
            interval: 3,
            tzid: 'UTC',
          },
        },
      },
      references: [],
      managed: false,
      updated_at: '2025-05-06T21:12:06.584Z',
      created_at: '2025-05-06T21:12:06.584Z',
      version: 'WzIsMV0=',
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: '10.1.0',
      score: 0,
    },
  ],
};
const lastRunResponse: CreatedAtSearchResponse = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: { value: 2, relation: 'eq' },
    max_score: null,
    hits: [
      {
        _index: '.ds-.kibana-reporting-2025.05.06-000001',
        _id: '7c14d3e0-5d3f-4374-87f8-1758d2aaa10b',
        _score: null,
        _source: {
          created_at: '2025-05-06T21:12:07.198Z',
        },
        fields: {
          'scheduled_report_id.keyword': ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        },
        sort: [1746565930198],
      },
      {
        _index: '.ds-.kibana-reporting-2025.05.06-000001',
        _id: '895f9620-cf3c-4e9e-9bf2-3750360ebd81',
        _score: null,
        _source: {
          created_at: '2025-05-06T12:00:00.500Z',
        },
        fields: {
          'scheduled_report_id.keyword': ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca'],
        },
        sort: [1746565930198],
      },
    ],
  },
};

describe('scheduledQueryFactory', () => {
  let client: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let core: ReportingCore;
  let soClient: SavedObjectsClientContract;
  let scheduledQuery: ReturnType<typeof scheduledQueryFactory>;

  beforeEach(async () => {
    const schema = createMockConfigSchema();
    core = await createMockReportingCore(schema);

    soClient = await core.getSoClient();
    soClient.find = jest.fn().mockImplementation(async () => {
      return soResponse;
    });
    client = (await core.getEsClient()).asInternalUser as typeof client;
    client.search.mockResponse(
      lastRunResponse as unknown as Awaited<ReturnType<ElasticsearchClient['search']>>
    );
    scheduledQuery = scheduledQueryFactory(core);
    jest.spyOn(core, 'canManageReportingForSpace').mockResolvedValue(true);
  });

  describe('list', () => {
    it('should pass parameters in the request body', async () => {
      const result = await scheduledQuery.list(fakeRawRequest, { username: 'somebody' }, 1, 10);

      expect(soClient.find).toHaveBeenCalledTimes(1);
      expect(soClient.find).toHaveBeenCalledWith({
        type: 'scheduled_report',
        page: 1,
        perPage: 10,
      });
      expect(client.search).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledWith({
        _source: ['created_at'],
        collapse: { field: 'scheduled_report_id.keyword' },
        index: '.reporting-*,.kibana-reporting*',
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'scheduled_report_id.keyword': [
                    'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
                    '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
                  ],
                },
              },
            ],
          },
        },
        size: 10,
        sort: [{ created_at: { order: 'desc' } }],
      });

      expect(result).toEqual({
        page: 1,
        per_page: 10,
        total: 2,
        data: [
          {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            created_at: '2025-05-06T21:10:17.137Z',
            created_by: 'elastic',
            enabled: true,
            jobtype: 'printable_pdf_v2',
            last_run: '2025-05-06T12:00:00.500Z',
            next_run: expect.any(String),
            schedule: {
              rrule: {
                freq: 3,
                interval: 3,
                byhour: [12],
                byminute: [0],
                tzid: 'UTC',
              },
            },
            title: '[Logs] Web Traffic',
          },
          {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            created_at: '2025-05-06T21:12:06.584Z',
            created_by: 'elastic',
            enabled: true,
            jobtype: 'PNGV2',
            last_run: '2025-05-06T21:12:07.198Z',
            next_run: expect.any(String),
            notification: {
              email: {
                to: ['user@elastic.co'],
              },
            },
            title: '[Logs] Web Traffic',
            schedule: {
              rrule: {
                freq: 1,
                interval: 3,
                tzid: 'UTC',
              },
            },
          },
        ],
      });
    });

    it('should filter by username when user does not have manage reporting permissions', async () => {
      jest.spyOn(core, 'canManageReportingForSpace').mockResolvedValueOnce(false);
      await scheduledQuery.list(fakeRawRequest, { username: 'somebody' }, 1, 10);

      expect(soClient.find).toHaveBeenCalledTimes(1);
      expect(soClient.find).toHaveBeenCalledWith({
        type: 'scheduled_report',
        page: 1,
        perPage: 10,
        filter: 'createdBy: "somebody"',
      });
      expect(client.search).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledWith({
        _source: ['created_at'],
        collapse: { field: 'scheduled_report_id.keyword' },
        index: '.reporting-*,.kibana-reporting*',
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'scheduled_report_id.keyword': [
                    'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
                    '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
                  ],
                },
              },
            ],
          },
        },
        size: 10,
        sort: [{ created_at: { order: 'desc' } }],
      });
    });

    it('should return an empty array when there are no hits', async () => {
      soClient.find = jest.fn().mockImplementationOnce(async () => ({
        page: 1,
        per_page: 10,
        total: 0,
        saved_objects: [],
      }));
      const result = await scheduledQuery.list(fakeRawRequest, { username: 'somebody' }, 1, 10);
      expect(soClient.find).toHaveBeenCalledTimes(1);
      expect(soClient.find).toHaveBeenCalledWith({
        type: 'scheduled_report',
        page: 1,
        perPage: 10,
      });
      expect(client.search).not.toHaveBeenCalled();
      expect(result).toEqual({ page: 1, per_page: 10, total: 0, data: [] });
    });

    it('should reject if the soClient.find throws an error', async () => {
      soClient.find = jest.fn().mockImplementationOnce(async () => {
        throw new Error('Some error');
      });

      await expect(
        scheduledQuery.list(fakeRawRequest, { username: 'somebody' }, 1, 10)
      ).rejects.toMatchInlineSnapshot(`[Error: Some error]`);
    });

    it('should reject if the esClient.search throws an error', async () => {
      client.search.mockImplementationOnce(async () => {
        throw new Error('Some other error');
      });

      await expect(
        scheduledQuery.list(fakeRawRequest, { username: 'somebody' }, 1, 10)
      ).rejects.toMatchInlineSnapshot(`[Error: Some other error]`);
    });
  });
});

describe('transformResponse', () => {
  it('should correctly transform the responses', () => {
    expect(transformResponse(soResponse, lastRunResponse)).toEqual({
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          created_at: '2025-05-06T21:10:17.137Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'printable_pdf_v2',
          last_run: '2025-05-06T12:00:00.500Z',
          next_run: expect.any(String),
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          title: '[Logs] Web Traffic',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
        },
      ],
    });
  });

  it('handles missing last run response', () => {
    const thisLastRunResponse: CreatedAtSearchResponse = {
      ...lastRunResponse,
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [lastRunResponse.hits.hits[0]],
      },
    };

    expect(transformResponse(soResponse, thisLastRunResponse)).toEqual({
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          created_at: '2025-05-06T21:10:17.137Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'printable_pdf_v2',
          last_run: undefined,
          next_run: expect.any(String),
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          title: '[Logs] Web Traffic',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
        },
      ],
    });
  });
});
