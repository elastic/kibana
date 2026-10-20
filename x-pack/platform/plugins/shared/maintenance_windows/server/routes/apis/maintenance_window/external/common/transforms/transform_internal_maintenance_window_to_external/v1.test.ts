/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import { transformInternalMaintenanceWindowToExternal } from './v1';
import { maintenanceWindowResponseSchema } from '../../../../../../schemas/maintenance_window/external/response';

const baseWindow = {
  title: 'test-maintenance-window',
  id: 'foobar',
  status: 'running' as const,
  createdAt: '2021-03-07T00:00:00.000Z',
  createdBy: 'me',
  updatedAt: '2021-03-07T00:00:00.000Z',
  updatedBy: 'me',
  enabled: false,
  categoryIds: undefined,
  duration: 864000000,
  rRule: {
    dtstart: '2021-03-07T00:00:00.000Z',
    tzid: 'UTC',
    byweekday: ['MO', 'FR'],
    freq: Frequency.WEEKLY,
    interval: 1,
    until: '2022-05-17T05:05:00.000Z',
    bymonth: undefined,
    count: undefined,
    bymonthday: undefined,
  },
  schedule: {
    custom: {
      duration: '10d',
      start: '2021-03-07T00:00:00.000Z',
      timezone: 'UTC',
      recurring: {
        every: '1d',
        end: '2022-05-17T05:05:00.000Z',
        onWeekDay: ['MO', 'FR'],
      },
    },
  },
  events: [],
  eventStartTime: '',
  eventEndTime: '',
  expirationDate: '',
};

describe('transformInternalMaintenanceWindowToExternal', () => {
  it('transforms every field correctly', () => {
    expect(
      transformInternalMaintenanceWindowToExternal({
        ...baseWindow,
        enabled: false,
        categoryIds: ['observability'],
        scope: {
          alerting: {
            enabled: true,
            filters: [],
            kql: "_id: '1234'",
          },
        },
      })
    ).toEqual({
      title: 'test-maintenance-window',
      id: 'foobar',
      enabled: false,
      schedule: {
        custom: {
          duration: '10d',
          start: '2021-03-07T00:00:00.000Z',
          timezone: 'UTC',
          recurring: {
            every: '1d',
            end: '2022-05-17T05:05:00.000Z',
            onWeekDay: ['MO', 'FR'],
          },
        },
      },
      scope: {
        alerting: {
          enabled: true,
          query: {
            kql: "_id: '1234'",
          },
        },
      },
      created_at: '2021-03-07T00:00:00.000Z',
      created_by: 'me',
      updated_at: '2021-03-07T00:00:00.000Z',
      updated_by: 'me',
      status: 'running',
    });
  });

  it('does not return scope when v1 is enabled with no kql and no v2 (byte-identical to main)', () => {
    // This is the default case: alerting v1 applies to all alerts with no filter.
    // Omitting scope preserves backward compatibility for existing clients.
    expect(
      transformInternalMaintenanceWindowToExternal({
        ...baseWindow,
        enabled: true,
        scope: {
          alerting: {
            enabled: true,
            filters: [],
            kql: undefined,
          },
        },
      })
    ).toEqual(
      expect.not.objectContaining({
        scope: expect.anything(),
      })
    );
  });

  it('transforms does not return scope if scope is missing', () => {
    expect(
      transformInternalMaintenanceWindowToExternal({
        ...baseWindow,
        enabled: false,
        categoryIds: ['securitySolution'],
      })
    ).toEqual({
      title: 'test-maintenance-window',
      id: 'foobar',
      enabled: false,
      schedule: {
        custom: {
          duration: '10d',
          start: '2021-03-07T00:00:00.000Z',
          timezone: 'UTC',
          recurring: {
            every: '1d',
            end: '2022-05-17T05:05:00.000Z',
            onWeekDay: ['MO', 'FR'],
          },
        },
      },
      created_at: '2021-03-07T00:00:00.000Z',
      created_by: 'me',
      updated_at: '2021-03-07T00:00:00.000Z',
      updated_by: 'me',
      status: 'running',
    });
  });

  // Schema-validation guard: push every scope permutation through the GA response schema.
  // This catches any mismatch between the transform output and the published OAS contract
  // without needing a running Kibana.
  describe('schema validation guard', () => {
    const validate = (mw: Parameters<typeof transformInternalMaintenanceWindowToExternal>[0]) =>
      expect(() =>
        maintenanceWindowResponseSchema.validate(transformInternalMaintenanceWindowToExternal(mw))
      ).not.toThrow();

    it('validates: no scope (legacy unfiltered)', () => validate({ ...baseWindow }));

    it('validates: v1 enabled, no kql', () =>
      validate({
        ...baseWindow,
        scope: { alerting: { enabled: true, filters: [], kql: undefined } },
      }));

    it('validates: v1 enabled, with kql', () =>
      validate({
        ...baseWindow,
        scope: { alerting: { enabled: true, filters: [], kql: "_id: '1234'" } },
      }));

    it('validates: v1 disabled, v2 with kql', () =>
      validate({
        ...baseWindow,
        scope: {
          alerting: { enabled: false, filters: [] },
          alertingV2: { enabled: true, kql: 'rule.id: abc' },
        },
      }));

    it('validates: v1 enabled with kql, v2 with kql', () =>
      validate({
        ...baseWindow,
        scope: {
          alerting: { enabled: true, filters: [], kql: "_id: '1234'" },
          alertingV2: { enabled: true, kql: 'rule.id: abc' },
        },
      }));

    it('validates: v2 only (v1 absent from scope)', () =>
      validate({
        ...baseWindow,
        scope: { alertingV2: { enabled: true } },
      }));
  });
});
