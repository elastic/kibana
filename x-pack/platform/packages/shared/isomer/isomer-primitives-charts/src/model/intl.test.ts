/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateTimeFormat, numberFormat } from './intl';

describe('shared Intl formatters', () => {
  it('builds one formatter per locale and options', () => {
    const percent = numberFormat('en-US', { style: 'percent' });

    expect(numberFormat('en-US', { style: 'percent' })).toBe(percent);
    expect(numberFormat('en-US', { style: 'decimal' })).not.toBe(percent);
    expect(percent.format(0.25)).toBe('25%');
  });

  it('keeps time zones apart', () => {
    const utc = dateTimeFormat('en-US', { timeZone: 'UTC', hour: 'numeric', hourCycle: 'h23' });
    const tokyo = dateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      hour: 'numeric',
      hourCycle: 'h23',
    });

    expect(utc).not.toBe(tokyo);
    expect(utc.format(0)).toBe('00');
    expect(tokyo.format(0)).toBe('09');
  });
});
