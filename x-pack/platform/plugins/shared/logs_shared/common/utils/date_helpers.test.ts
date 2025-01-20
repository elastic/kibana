/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { subtractMillisecondsFromDate } from './date_helpers';

describe('Date Helpers', function () {
  describe('subtractMillisecondsFromDate', function () {
    it('should subtract milliseconds from the nano date correctly', () => {
      const inputDate = '2023-10-30T12:00:00.001000000Z';
      const millisecondsToSubtract = 1;

      const result = subtractMillisecondsFromDate(inputDate, millisecondsToSubtract);

      const expectedDate = '2023-10-30T12:00:00.000000000Z';

      expect(result).toBe(expectedDate);
    });

    it('should subtract seconds from the date if no milliseconds available', () => {
      const inputDate = '2023-10-30T12:00:00.000000000Z';
      const millisecondsToSubtract = 1;

      const result = subtractMillisecondsFromDate(inputDate, millisecondsToSubtract);

      const expectedDate = '2023-10-30T11:59:59.999000000Z';

      expect(result).toBe(expectedDate);
    });

    it('should convert date to nano and subtract milliseconds properly', () => {
      const inputDate = '2023-10-30T12:00:00.000Z';
      const millisecondsToSubtract = 1;

      const result = subtractMillisecondsFromDate(inputDate, millisecondsToSubtract);

      const expectedDate = '2023-10-30T11:59:59.999000000Z';

      expect(result).toBe(expectedDate);
    });
  });
});
