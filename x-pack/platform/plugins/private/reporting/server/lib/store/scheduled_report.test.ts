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

// test('SavedReport should succeed if report has ES document fields present', () => {
//   const createInstance = () => {
//     return new SavedReport({
//       _id: '290357209345723095',
//       _index: '.reporting-fantastic',
//       _seq_no: 23,
//       _primary_term: 354000,
//       jobtype: 'cool-report',
//       payload: {
//         headers: '',
//         title: '',
//         browserTimezone: '',
//         objectType: '',
//         version: '',
//       },
//     });
//   };
//   expect(createInstance).not.toThrow();
// });

test('ScheduledReport should throw an error if report payload is malformed', () => {
  const createInstance = () => {
    return new ScheduledReport({
      runAt: new Date('2023-10-01T00:00:00Z'),
      kibanaId: 'instance-uuid',
      kibanaName: 'kibana',
      queueTimeout: 120000,
      reportSO: {
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
    });
  };
  expect(createInstance).toThrowErrorMatchingInlineSnapshot(
    `"Unable to parse payload from scheduled report saved object: SyntaxError: Unexpected token 'a', \\"abc\\" is not valid JSON"`
  );
});

test('ScheduledReport should throw an error if report saved object is missing ID', () => {
  const createInstance = () => {
    return new ScheduledReport({
      runAt: new Date('2023-10-01T00:00:00Z'),
      kibanaId: 'instance-uuid',
      kibanaName: 'kibana',
      queueTimeout: 120000,
      // @ts-expect-error - missing id
      reportSO: {
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
    `"Invalid scheduled report saved object - no id"`
  );
});
