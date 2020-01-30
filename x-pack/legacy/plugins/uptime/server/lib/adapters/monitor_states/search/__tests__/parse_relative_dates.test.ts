/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { parseRelativeDates } from '../query_context';

describe('Parsing a relative date into time span timestamps', () => {
  it('returns the expected time span', async () => {
    let startDate = 'now/w';
    let endDate = 'now/w';

    let startDateStamp = DateMath.parse('now')
      ?.subtract(5, 'minutes')
      .valueOf();

    const { tsEnd: tsEnd1, tsStart: tsStart1 } = parseRelativeDates(startDate, endDate);
    expect(Date.now() - new Date(tsEnd1).getTime()).toBeLessThan(20);

    expect(new Date(tsStart1).getTime() - (startDateStamp as number)).toBeLessThan(20);

    startDate = 'now/d';
    endDate = 'now/d';

    startDateStamp = DateMath.parse('now')
      ?.subtract(5, 'minutes')
      .valueOf();

    const { tsEnd: tsEnd2, tsStart: tsStart2 } = parseRelativeDates(startDate, endDate);

    expect(Date.now() - new Date(tsEnd2).getTime()).toBeLessThan(20);

    expect(new Date(tsStart2).getTime() - (startDateStamp as number)).toBeLessThan(20);
  });
});
