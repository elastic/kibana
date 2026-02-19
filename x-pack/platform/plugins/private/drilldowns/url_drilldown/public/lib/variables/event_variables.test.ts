/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValueClickTriggerEventScope } from './event_variables';
import { getEventScopeValues, getEventVariableList } from './event_variables';
import type { RowClickContext } from '@kbn/ui-actions-plugin/public';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { createPoint, rowClickData } from '../test/data';

describe('VALUE_CLICK_TRIGGER', () => {
  describe('supports `points[]`', () => {
    test('getEventScopeValues()', () => {
      const mockDataPoints = [
        createPoint({ field: 'field0', value: 'value0' }),
        createPoint({ field: 'field1', value: 'value1' }),
        createPoint({ field: 'field2', value: 'value2' }),
      ];

      const eventScope = getEventScopeValues({
        data: { data: mockDataPoints },
      }) as ValueClickTriggerEventScope;

      expect(eventScope.key).toBe('field0');
      expect(eventScope.value).toBe('value0');
      expect(eventScope.points).toHaveLength(mockDataPoints.length);
      expect(eventScope.points).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": "field0",
            "value": "value0",
          },
          Object {
            "key": "field1",
            "value": "value1",
          },
          Object {
            "key": "field2",
            "value": "value2",
          },
        ]
      `);
    });
  });

  describe('handles undefined, null or missing values', () => {
    test('undefined or missing values are removed from the result scope', () => {
      const point = createPoint({ field: undefined } as unknown as {
        field: string;
        value: string | null | number | boolean;
      });
      const eventScope = getEventScopeValues({
        data: { data: [point] },
      }) as ValueClickTriggerEventScope;

      expect('key' in eventScope).toBeFalsy();
      expect('value' in eventScope).toBeFalsy();
    });

    test('null value stays in the result scope', () => {
      const point = createPoint({ field: 'field', value: null });
      const eventScope = getEventScopeValues({
        data: { data: [point] },
      }) as ValueClickTriggerEventScope;

      expect(eventScope.value).toBeNull();
    });
  });
});

describe('ROW_CLICK_TRIGGER', () => {
  test('getEventVariableList() returns correct list of runtime variables', () => {
    const vars = getEventVariableList({
      triggers: [ROW_CLICK_TRIGGER],
    });
    expect(vars.map(({ label }) => label)).toEqual([
      'event.values',
      'event.keys',
      'event.columnNames',
      'event.rowIndex',
    ]);
  });

  test('getEventScopeValues() returns correct variables for row click trigger', () => {
    const context = {
      embeddable: {},
      data: rowClickData as any,
    } as unknown as RowClickContext;
    const res = getEventScopeValues(context);

    expect(res).toEqual({
      rowIndex: 1,
      values: ['IT', '2.25', 3, 0, 2],
      keys: ['DestCountry', 'FlightTimeHour', '', 'DistanceMiles', 'OriginAirportID'],
      columnNames: [
        'Top values of DestCountry',
        'Top values of FlightTimeHour',
        'Count of records',
        'Average of DistanceMiles',
        'Unique count of OriginAirportID',
      ],
    });
  });
});
