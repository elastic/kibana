/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isWithinCurrentDate } from '../is_within_current_date';

describe('isWithinCurrentDate', () => {
  beforeEach(() => {
    // Thu, 19 Jul 2001 17:39:39 GMT
    Date.now = jest.fn(() => 995564379100);
  });

  it('returns true for timespan within current date', () => {
    // Thu, 19 Jul 2001 14:06:19 GMT -> Thu, 19 Jul 2001 18:52:59 GMT
    expect(isWithinCurrentDate(995551579000, 995568779000)).toBe(true);
  });

  it('returns false for timespan crossing current date', () => {
    // Thu, 19 Jul 2001 14:06:19 GMT ->  Fri, 20 Jul 2001 22:39:39 GMT
    expect(isWithinCurrentDate(995551579000, 995668779000)).toBe(false);
  });
});
