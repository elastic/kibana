/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getTimeOptions, getTimeFieldOptions } from './get_time_options';

describe('get_time_options', () => {
  test('if getTimeOptions return single unit time options', () => {
    const timeUnitValue = getTimeOptions('1');
    expect(timeUnitValue).toMatchObject([
      { text: 'second', value: 's' },
      { text: 'minute', value: 'm' },
      { text: 'hour', value: 'h' },
      { text: 'day', value: 'd' },
    ]);
  });

  test('if getTimeOptions return multiple unit time options', () => {
    const timeUnitValue = getTimeOptions('10');
    expect(timeUnitValue).toMatchObject([
      { text: 'seconds', value: 's' },
      { text: 'minutes', value: 'm' },
      { text: 'hours', value: 'h' },
      { text: 'days', value: 'd' },
    ]);
  });

  test('if ', () => {
    const timeOnlyTypeFields = getTimeFieldOptions(
      [
        { type: 'date', name: 'order_date' },
        { type: 'number', name: 'sum' },
      ],
      {
        text: 'select',
        value: '',
      }
    );
    expect(timeOnlyTypeFields).toMatchObject([
      {
        text: 'select',
        value: '',
      },
      { text: 'order_date', value: 'order_date' },
    ]);
  });
});
