/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/task-manager-plugin/server';
import { ScheduledReport } from '.';

const payload = {
  headers: '',
  title: 'Test Report',
  browserTimezone: '',
  objectType: 'test',
  version: '8.0.0',
};

test('ScheduledReport should return correctly formatted outputs', () => {
  const scheduledReport = new ScheduledReport({
    runAt: new Date('2023-10-01T00:00:00Z'),
    kibanaId: 'instance-uuid',
    kibanaName: 'kibana',
    queueTimeout: 120000,
    spaceId: 'a-space',
    scheduledReport: {
      id: 'report-so-id-111',
      attributes: {
        createdAt: new Date().toISOString(),
        createdBy: 'test-user',
        enabled: true,
        jobType: 'test1',
        meta: { objectType: 'test' },
        migrationVersion: '8.0.0',
        payload: JSON.stringify(payload),
        schedule: { rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' } },
        title: 'Test Report',
      },
      references: [],
      type: 'scheduled-report',
    },
  });
  expect(scheduledReport.toReportTaskJSON()).toEqual({
    attempts: 1,
    created_at: '2023-10-01T00:00:00.000Z',
    created_by: 'test-user',
    id: expect.any(String),
    index: '.kibana-reporting',
    jobtype: 'test1',
    meta: {
      objectType: 'test',
    },
    payload: {
      browserTimezone: '',
      forceNow: '2023-10-01T00:00:00.000Z',
      headers: '',
      objectType: 'test',
      title: 'Test Report [2023-10-01T00:00:00.000Z]',
      version: '8.0.0',
    },
  });

  expect(scheduledReport.toReportSource()).toEqual({
    attempts: 1,
    max_attempts: 1,
    created_at: '2023-10-01T00:00:00.000Z',
    created_by: 'test-user',
    jobtype: 'test1',
    meta: {
      objectType: 'test',
    },
    migration_version: '7.14.0',
    kibana_id: 'instance-uuid',
    kibana_name: 'kibana',
    output: null,
    payload: {
      browserTimezone: '',
      forceNow: '2023-10-01T00:00:00.000Z',
      headers: '',
      objectType: 'test',
      title: 'Test Report [2023-10-01T00:00:00.000Z]',
      version: '8.0.0',
    },
    scheduled_report_id: 'report-so-id-111',
    space_id: 'a-space',
    status: 'processing',
    started_at: expect.any(String),
    process_expiration: expect.any(String),
    timeout: 120000,
  });

  expect(scheduledReport.toApiJSON()).toEqual({
    id: expect.any(String),
    index: '.kibana-reporting',
    kibana_id: 'instance-uuid',
    kibana_name: 'kibana',
    jobtype: 'test1',
    created_at: '2023-10-01T00:00:00.000Z',
    created_by: 'test-user',
    meta: {
      objectType: 'test',
    },
    timeout: 120000,
    max_attempts: 1,
    status: 'processing',
    attempts: 1,
    started_at: expect.any(String),
    space_id: 'a-space',
    migration_version: '7.14.0',
    output: {},
    queue_time_ms: expect.any(Number),
    payload: {
      browserTimezone: '',
      forceNow: '2023-10-01T00:00:00.000Z',
      objectType: 'test',
      title: 'Test Report [2023-10-01T00:00:00.000Z]',
      version: '8.0.0',
    },
    scheduled_report_id: 'report-so-id-111',
  });
});

test('ScheduledReport should throw an error if report payload is malformed', () => {
  const createInstance = () => {
    return new ScheduledReport({
      runAt: new Date('2023-10-01T00:00:00Z'),
      kibanaId: 'instance-uuid',
      kibanaName: 'kibana',
      queueTimeout: 120000,
      scheduledReport: {
        id: 'report-so-id-111',
        attributes: {
          createdAt: new Date().toISOString(),
          createdBy: 'test-user',
          enabled: true,
          jobType: 'test1',
          meta: { objectType: 'test' },
          migrationVersion: '8.0.0',
          payload: 'abc',
          schedule: { rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' } },
          title: 'Test Report',
        },
        references: [],
        type: 'scheduled-report',
      },
      spaceId: 'another-space',
    });
  };
  expect(createInstance).toThrowErrorMatchingInlineSnapshot(
    `"Unable to parse payload from scheduled_report saved object: SyntaxError: Unexpected token 'a', \\"abc\\" is not valid JSON"`
  );
});

test('ScheduledReport should throw an error if scheduled_report saved object is missing ID', () => {
  const createInstance = () => {
    return new ScheduledReport({
      runAt: new Date('2023-10-01T00:00:00Z'),
      kibanaId: 'instance-uuid',
      kibanaName: 'kibana',
      queueTimeout: 120000,
      spaceId: 'another-space',
      // @ts-expect-error - missing id
      scheduledReport: {
        attributes: {
          createdAt: new Date().toISOString(),
          createdBy: 'test-user',
          enabled: true,
          jobType: 'test1',
          meta: { objectType: 'test' },
          migrationVersion: '8.0.0',
          payload: JSON.stringify(payload),
          schedule: { rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' } },
          title: 'Test Report',
        },
        references: [],
        type: 'scheduled-report',
      },
    });
  };
  expect(createInstance).toThrowErrorMatchingInlineSnapshot(
    `"Invalid scheduled_report saved object - no id"`
  );
});
