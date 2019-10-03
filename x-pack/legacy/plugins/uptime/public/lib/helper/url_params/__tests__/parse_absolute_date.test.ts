/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import moment from 'moment';
import { parseAbsoluteDate } from '../parse_absolute_date';

describe('parseAbsoluteDate', () => {
  let dateMathSpy: any;
  const MOCK_VALUE = 132435465789;

  beforeEach(() => {
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(moment(MOCK_VALUE));
  });

  it('returns the parsed value for a valid date string', () => {
    const result = parseAbsoluteDate('now-15m', 12345);
    expect(result).toBe(MOCK_VALUE);
  });

  it('returns the default value if the parser provides `undefined`', () => {
    dateMathSpy.mockReturnValue(undefined);
    const result = parseAbsoluteDate('this is not a valid datae', 12345);
    expect(result).toBe(12345);
  });
});
