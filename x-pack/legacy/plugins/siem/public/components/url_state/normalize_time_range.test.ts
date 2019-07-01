/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { normalizeTimeRange } from './normalize_time_range';
import {
  URLTimeRange,
  AbsoluteTimeRange,
  isAbsoluteTimeRange,
  RelativeTimeRange,
  isRelativeTimeRange,
} from '../../store/inputs/model';

describe('#normalizeTimeRange', () => {
  test('Absolute time range returns empty strings as 0', () => {
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: '',
      to: '',
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: 0,
        to: 0,
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Absolute time range returns string with empty spaces as 0', () => {
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: '  ',
      to: '   ',
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: 0,
        to: 0,
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Absolute time range returns string date time as valid date with from and to as ISO strings', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: from.toISOString(),
      to: to.toISOString(),
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: from.valueOf(),
        to: to.valueOf(),
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Absolute time range returns number as valid date with from and to as Epoch', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: from.valueOf(),
      to: to.valueOf(),
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: from.valueOf(),
        to: to.valueOf(),
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Absolute time range returns number as valid date with from and to as Epoch when the Epoch is a string', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: `${from.valueOf()}`,
      to: `${to.valueOf()}`,
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: from.valueOf(),
        to: to.valueOf(),
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Absolute time range returns NaN with from and to when garbage is sent in', () => {
    const to = 'garbage';
    const from = 'garbage';
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from,
      to,
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: NaN,
        to: NaN,
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Relative time range returns empty strings as 0', () => {
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from: '',
      to: '',
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: 0,
        to: 0,
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });

  test('Relative time range returns string with empty spaces as 0', () => {
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from: '  ',
      to: '   ',
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: 0,
        to: 0,
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });

  test('Relative time range returns string date time as valid date with from and to as ISO strings', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from: from.toISOString(),
      to: to.toISOString(),
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: from.valueOf(),
        to: to.valueOf(),
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });

  test('Relative time range returns number as valid date with from and to as Epoch', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from: from.valueOf(),
      to: to.valueOf(),
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: from.valueOf(),
        to: to.valueOf(),
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });

  test('Relative time range returns number as valid date with from and to as Epoch when the Epoch is a string', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from: `${from.valueOf()}`,
      to: `${to.valueOf()}`,
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: from.valueOf(),
        to: to.valueOf(),
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });

  test('Relative time range returns NaN with from and to when garbage is sent in', () => {
    const to = 'garbage';
    const from = 'garbage';
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from,
      to,
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: NaN,
        to: NaN,
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });
});
