/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertTimeRange } from './get_alert_time_range';

describe('getAlertTimeRange', () => {
  const testData: any[] = [
    // Description, Start, End, Output
    [
      'Duration 1 hour, time range will be extended it with 7 minutes from each side',
      '2023-03-28T08:22:32.660Z',
      '2023-03-28T09:22:32.660Z',
      { from: '2023-03-28T08:15:02.660Z', to: '2023-03-28T09:30:02.660Z' },
    ],
    [
      'Duration 5 minutes, time range will be extended it with 20 minutes from each side',
      '2023-03-28T08:22:33.660Z',
      '2023-03-28T08:27:33.660Z',
      { from: '2023-03-28T08:02:33.660Z', to: '2023-03-28T08:47:33.660Z' },
    ],
  ];

  it.each(testData)('%s', (_, start, end, output) => {
    expect(getAlertTimeRange(start, end)).toEqual(output);
  });

  describe('active alert', () => {
    const mockedDate = '2023-03-28T09:22:32.660Z';
    const mockDate = jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => new Date(mockedDate).valueOf());

    afterAll(() => mockDate.mockRestore());

    it('without end time', () => {
      const start = '2023-03-28T08:22:32.660Z';
      const output = {
        // Time range is from 7.5 minutes before start
        from: '2023-03-28T08:15:02.660Z',
        to: mockedDate,
      };
      expect(getAlertTimeRange(start)).toEqual(output);
    });
  });
});
