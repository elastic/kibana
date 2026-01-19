/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { formatDateTimeLocal } from './formatting';

describe('formatDateTimeLocal', () => {
  const date = new Date('2020-01-02T03:04:05.000Z');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('formats using an explicit timezone', () => {
    expect(formatDateTimeLocal(date, 'UTC')).toEqual(moment.tz(date, 'UTC').format('LL LTS'));
  });

  it('treats dateFormat:tz=Browser as the guessed timezone', () => {
    jest.spyOn(moment.tz, 'guess').mockReturnValue('America/Los_Angeles');

    expect(formatDateTimeLocal(date, 'Browser')).toEqual(
      moment.tz(date, 'America/Los_Angeles').format('LL LTS')
    );
  });

  it('defaults to the guessed timezone when timezone is unset or null', () => {
    jest.spyOn(moment.tz, 'guess').mockReturnValue('America/New_York');

    expect(formatDateTimeLocal(date)).toEqual(moment.tz(date, 'America/New_York').format('LL LTS'));
    expect(formatDateTimeLocal(date, null)).toEqual(
      moment.tz(date, 'America/New_York').format('LL LTS')
    );
  });
});
