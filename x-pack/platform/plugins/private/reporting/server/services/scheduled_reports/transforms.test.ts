/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { CreatedAtSearchResponse } from './scheduled_reports_service';
import {
  transformBulkDeleteResponse,
  transformListResponse,
  transformSingleResponse,
} from './transforms';
import type { ScheduledReportType } from '../../types';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { omit } from 'lodash';
import type { BulkGetResult } from '@kbn/task-manager-plugin/server/task_store';

const payload =
  '{"browserTimezone":"America/New_York","layout":{"dimensions":{"height":2220,"width":1364},"id":"preserve_layout"},"objectType":"dashboard","title":"[Logs] Web Traffic","version":"9.1.0","locatorParams":[{"id":"DASHBOARD_APP_LOCATOR","params":{"dashboardId":"edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b","preserveSavedFilters":true,"timeRange":{"from":"now-7d/d","to":"now"},"useHash":false,"viewMode":"view"}}],"isDeprecated":false}';
const jsonPayload = JSON.parse(payload);
const savedObjects: Array<SavedObject<ScheduledReportType>> = [
  {
    type: 'scheduled_report',
    id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
    namespaces: ['a-space'],
    attributes: {
      createdAt: '2025-05-06T21:10:17.137Z',
      createdBy: 'elastic',
      enabled: true,
      jobType: 'printable_pdf_v2',
      meta: { isDeprecated: false, layout: 'preserve_layout', objectType: 'dashboard' },
      migrationVersion: '9.1.0',
      title: '[Logs] Web Traffic',
      payload,
      schedule: { rrule: { freq: 3, interval: 3, byhour: [12], byminute: [0], tzid: 'UTC' } },
    },
    references: [],
    managed: false,
    updated_at: '2025-05-06T21:10:17.137Z',
    created_at: '2025-05-06T21:10:17.137Z',
    version: 'WzEsMV0=',
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.1.0',
  },
  {
    type: 'scheduled_report',
    id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
    namespaces: ['a-space'],
    attributes: {
      createdAt: '2025-05-06T21:12:06.584Z',
      createdBy: 'not-elastic',
      enabled: true,
      jobType: 'PNGV2',
      meta: { isDeprecated: false, layout: 'preserve_layout', objectType: 'dashboard' },
      migrationVersion: '9.1.0',
      notification: { email: { to: ['user@elastic.co'] } },
      title: 'Another cool dashboard',
      payload:
        '{"browserTimezone":"America/New_York","layout":{"dimensions":{"height":2220,"width":1364},"id":"preserve_layout"},"objectType":"dashboard","title":"[Logs] Web Traffic","version":"9.1.0","locatorParams":[{"id":"DASHBOARD_APP_LOCATOR","params":{"dashboardId":"edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b","preserveSavedFilters":true,"timeRange":{"from":"now-7d/d","to":"now"},"useHash":false,"viewMode":"view"}}],"isDeprecated":false}',
      schedule: { rrule: { freq: 1, interval: 3, tzid: 'UTC' } },
    },
    references: [],
    managed: false,
    updated_at: '2025-05-06T21:12:06.584Z',
    created_at: '2025-05-06T21:12:06.584Z',
    version: 'WzIsMV0=',
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.1.0',
  },
];
const soResponse: SavedObjectsFindResponse<ScheduledReportType> = {
  page: 1,
  per_page: 10,
  total: 2,
  saved_objects: savedObjects.map((so) => ({ ...so, score: 0 })),
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
        _source: { created_at: '2025-05-06T21:12:07.198Z' },
        fields: { scheduled_report_id: ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'] },
        sort: [1746565930198],
      },
      {
        _index: '.ds-.kibana-reporting-2025.05.06-000001',
        _id: '895f9620-cf3c-4e9e-9bf2-3750360ebd81',
        _score: null,
        _source: { created_at: '2025-05-06T12:00:00.500Z' },
        fields: { scheduled_report_id: ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca'] },
        sort: [1746565930198],
      },
    ],
  },
};

const nextRunResponse: BulkGetResult = [
  {
    tag: 'ok',
    value: {
      taskType: 'report:execute-scheduled',
      state: {},
      ownerId: '',
      params: {
        id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
        spaceId: 'default',
        jobtype: 'printable_pdf_v2',
      },
      schedule: {
        rrule: {
          dtstart: '2025-09-03T16:49:00.000Z',
          tzid: 'America/New_York',
          byhour: [12],
          byminute: [49],
          freq: 3,
          interval: 1,
          byweekday: ['WE'],
        },
      },
      traceparent: '',
      enabled: true,
      attempts: 0,
      scheduledAt: new Date('2025-09-03T16:49:17.952Z'),
      startedAt: null,
      retryAt: null,
      runAt: new Date('2025-09-10T16:49:00.000Z'),
      status: TaskStatus.Idle,
      partition: 146,
      userScope: {
        apiKeyId: 'ueR7EJkB2N4RCOVIjhec',
        spaceId: 'default',
        apiKeyCreatedByUser: false,
      },
      apiKey: 'dWVSN0VKa0IyTjRSQ09WSWpoZWM6OEUyZUYtWDlSNndKckdMY0hPTElpZw==',
      id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
      version: 'WzYzMSwxXQ==',
    },
  },
  {
    tag: 'ok',
    value: {
      taskType: 'report:execute-scheduled',
      state: {},
      ownerId: '',
      params: {
        id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
        spaceId: 'default',
        jobtype: 'printable_pdf_v2',
      },
      schedule: {
        rrule: {
          dtstart: '2025-09-03T16:49:00.000Z',
          tzid: 'America/New_York',
          byhour: [12],
          byminute: [49],
          freq: 3,
          interval: 1,
          byweekday: ['WE'],
        },
      },
      traceparent: '',
      enabled: true,
      attempts: 0,
      scheduledAt: new Date('2025-09-03T16:49:17.952Z'),
      startedAt: null,
      retryAt: null,
      runAt: new Date('2025-09-12T08:30:00.000Z'),
      status: TaskStatus.Idle,
      partition: 146,
      userScope: {
        apiKeyId: 'ueR7EJkB2N4RCOVIjhec',
        spaceId: 'default',
        apiKeyCreatedByUser: false,
      },
      apiKey: 'dWVSN0VKa0IyTjRSQ09WSWpoZWM6OEUyZUYtWDlSNndKckdMY0hPTElpZw==',
      id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
      version: 'WzYzMSwxXQ==',
    },
  },
];

const mockLogger = loggingSystemMock.createLogger();

describe('transformListResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should correctly transform the responses', () => {
    expect(transformListResponse(mockLogger, soResponse, lastRunResponse, nextRunResponse)).toEqual(
      {
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
            next_run: '2025-09-10T16:49:00.000Z',
            payload: jsonPayload,
            schedule: {
              rrule: {
                freq: 3,
                interval: 3,
                byhour: [12],
                byminute: [0],
                tzid: 'UTC',
              },
            },
            space_id: 'a-space',
            title: '[Logs] Web Traffic',
          },
          {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            created_at: '2025-05-06T21:12:06.584Z',
            created_by: 'not-elastic',
            enabled: true,
            jobtype: 'PNGV2',
            last_run: '2025-05-06T21:12:07.198Z',
            next_run: '2025-09-12T08:30:00.000Z',
            notification: {
              email: {
                to: ['user@elastic.co'],
              },
            },
            payload: jsonPayload,
            title: 'Another cool dashboard',
            schedule: {
              rrule: {
                freq: 1,
                interval: 3,
                tzid: 'UTC',
              },
            },
            space_id: 'a-space',
          },
        ],
      }
    );
  });

  it('should still calculate the next_run date when nextRunResponse is undefined', () => {
    expect(transformListResponse(mockLogger, soResponse, lastRunResponse)).toEqual({
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
          payload: jsonPayload,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
        },
      ],
    });
  });

  it('should correctly transform the responses with rrule.dtstart field', () => {
    expect(
      transformListResponse(
        mockLogger,
        {
          ...soResponse,
          saved_objects: savedObjects.map((so) => ({
            ...so,
            attributes: {
              ...so.attributes,
              schedule: {
                ...so.attributes.schedule,
                rrule: {
                  ...so.attributes.schedule.rrule,
                  dtstart: new Date().toISOString(),
                },
              },
            },
            score: 0,
          })),
        },
        lastRunResponse
      )
    ).toEqual({
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
          payload: jsonPayload,
          schedule: {
            rrule: {
              dtstart: expect.any(String),
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              dtstart: expect.any(String),
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
        },
      ],
    });
  });

  it('should correctly transform a response with rrule.dtstart is in the future', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-05-06T21:10:17.137Z'));

    // current time is 2025-05-06T21:10:17.137Z which is a Tuesday
    // schedule is set to run every Friday at 17:00 UTC
    // start time is set to 2025-05-11T12:00:00.000Z (which is a Sunday)
    // next run should be the next Friday after 2025-05-11T12:00:00.000Z which is 2025-05-16T17:00:00.000Z
    // not the actual next friday which would be 2025-05-09T17:00:00.000Z
    const dtstart = '2025-05-11T12:00:00.000Z';
    expect(
      transformSingleResponse(mockLogger, {
        type: 'scheduled_report',
        id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
        namespaces: ['a-space'],
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
          payload,
          schedule: {
            rrule: {
              dtstart,
              freq: 3,
              interval: 1,
              byhour: [17],
              byminute: [0],
              byweekday: ['FR'],
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
      })
    ).toEqual({
      id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
      created_at: '2025-05-06T21:10:17.137Z',
      created_by: 'elastic',
      enabled: true,
      jobtype: 'printable_pdf_v2',
      next_run: '2025-05-16T17:00:00.000Z',
      payload: jsonPayload,
      schedule: {
        rrule: {
          dtstart,
          freq: 3,
          interval: 1,
          byhour: [17],
          byminute: [0],
          byweekday: ['FR'],
          tzid: 'UTC',
        },
      },
      space_id: 'a-space',
      title: '[Logs] Web Traffic',
    });

    jest.useRealTimers();
  });

  it('handles malformed payload', () => {
    const malformedSo = {
      ...savedObjects[0],
      attributes: {
        ...savedObjects[0].attributes,
        payload: 'not a valid JSON',
      },
      score: 0,
    };
    expect(
      transformListResponse(
        mockLogger,
        {
          page: 1,
          per_page: 10,
          total: 1,
          saved_objects: [malformedSo],
        },
        lastRunResponse
      )
    ).toEqual({
      page: 1,
      per_page: 10,
      total: 1,
      data: [
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          created_at: '2025-05-06T21:10:17.137Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'printable_pdf_v2',
          last_run: '2025-05-06T12:00:00.500Z',
          next_run: expect.any(String),
          payload: undefined,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
      ],
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      `Failed to parse payload for scheduled report aa8b6fb3-cf61-4903-bce3-eec9ddc823ca: Unexpected token 'o', \"not a valid JSON\" is not valid JSON`
    );
  });

  it('handles missing last run response', () => {
    const thisLastRunResponse: CreatedAtSearchResponse = {
      ...lastRunResponse,
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [lastRunResponse.hits.hits[0]],
      },
    };

    expect(transformListResponse(mockLogger, soResponse, thisLastRunResponse)).toEqual({
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
          payload: jsonPayload,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
        },
      ],
    });
  });

  it('handles malformed so with no namespace', () => {
    const malformedSo1 = { ...savedObjects[0], namespaces: [], score: 0 };
    const malformedSo2 = { ...omit(savedObjects[1], 'namespaces'), score: 0 };
    expect(
      transformListResponse(
        mockLogger,
        {
          page: 1,
          per_page: 10,
          total: 2,
          saved_objects: [malformedSo1, malformedSo2],
        },
        lastRunResponse
      )
    ).toEqual({
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
          payload: jsonPayload,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'default',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'default',
        },
      ],
    });
  });

  it('handles undefined last run response', () => {
    expect(transformListResponse(mockLogger, soResponse)).toEqual({
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
          payload: jsonPayload,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: undefined,
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
        },
      ],
    });
  });
});

describe('transformBulkDeleteResponse', () => {
  it('should return the deleted ids, errors and the sum of items in total', () => {
    expect(
      transformBulkDeleteResponse({
        deletedSchedulesIds: ['1', '2'],
        errors: [{ id: 'test', message: 'Test' }],
      })
    ).toEqual({
      scheduled_report_ids: ['1', '2'],
      errors: [{ id: 'test', message: 'Test' }],
      total: 3,
    });
  });
});
