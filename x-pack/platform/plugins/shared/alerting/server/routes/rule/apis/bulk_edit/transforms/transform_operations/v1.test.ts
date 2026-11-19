/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import { transformOperations } from './v1';

describe('transformOperations', () => {
  const isSystemAction = (id: string) => id === 'my-system-action-id';

  describe('actions', () => {
    const defaultAction = {
      id: 'default-action',
      params: {},
    };

    const systemAction = {
      id: 'my-system-action-id',
      params: {},
    };

    it('transform the actions correctly', async () => {
      expect(
        transformOperations({
          operations: [
            { field: 'actions', operation: 'add', value: [defaultAction, systemAction] },
          ],
          isSystemAction,
        })
      ).toEqual([
        {
          field: 'actions',
          operation: 'add',
          value: [
            {
              group: 'default',
              id: 'default-action',
              params: {},
            },
            { id: 'my-system-action-id', params: {} },
          ],
        },
      ]);
    });

    it('returns an empty array if the operations are empty', async () => {
      expect(
        transformOperations({
          operations: [],
          isSystemAction,
        })
      ).toEqual([]);
    });

    it('returns an empty array if the operations are undefined', async () => {
      expect(
        transformOperations({
          isSystemAction,
        })
      ).toEqual([]);
    });
  });

  describe('schedule', () => {
    it('keeps interval schedules as they are', () => {
      expect(
        transformOperations({
          operations: [{ field: 'schedule', operation: 'set', value: { interval: '5m' } }],
          isSystemAction,
        })
      ).toEqual([{ field: 'schedule', operation: 'set', value: { interval: '5m' } }]);
    });

    it('parses rrule string schedules', () => {
      expect(
        transformOperations({
          operations: [
            {
              field: 'schedule',
              operation: 'set',
              value: { rrule: 'RRULE:FREQ=HOURLY;INTERVAL=2;BYMINUTE=30' },
            },
          ],
          isSystemAction,
        })
      ).toEqual([
        {
          field: 'schedule',
          operation: 'set',
          value: {
            rrule: { freq: Frequency.HOURLY, interval: 2, tzid: 'UTC', byminute: [30] },
          },
        },
      ]);
    });
  });
});
