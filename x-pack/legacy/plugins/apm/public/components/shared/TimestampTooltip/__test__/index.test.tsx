/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import moment from 'moment-timezone';
import {
  TimestampTooltip,
  asAbsoluteTime,
  asRelativeDateRange
} from '../index';
import { mockNow } from '../../../../utils/testHelpers';

describe('asAbsoluteTime', () => {
  afterAll(() => moment.tz.setDefault(''));

  it('should add a leading plus for timezones with positive UTC offset', () => {
    moment.tz.setDefault('Europe/Copenhagen');
    expect(asAbsoluteTime({ time: 1559390400000, precision: 'minutes' })).toBe(
      'Jun 1, 2019, 14:00 (UTC+2)'
    );
  });

  it('should add a leading minus for timezones with negative UTC offset', () => {
    moment.tz.setDefault('America/Los_Angeles');
    expect(asAbsoluteTime({ time: 1559390400000, precision: 'minutes' })).toBe(
      'Jun 1, 2019, 05:00 (UTC-7)'
    );
  });

  it('should use default UTC offset formatting when offset contains minutes', () => {
    moment.tz.setDefault('Canada/Newfoundland');
    expect(asAbsoluteTime({ time: 1559390400000, precision: 'minutes' })).toBe(
      'Jun 1, 2019, 09:30 (UTC-02:30)'
    );
  });

  it('should respect DST', () => {
    moment.tz.setDefault('Europe/Copenhagen');
    const timeWithDST = 1559390400000; //  Jun 1, 2019
    const timeWithoutDST = 1575201600000; //  Dec 1, 2019

    expect(asAbsoluteTime({ time: timeWithDST })).toBe(
      'Jun 1, 2019, 14:00:00.000 (UTC+2)'
    );

    expect(asAbsoluteTime({ time: timeWithoutDST })).toBe(
      'Dec 1, 2019, 13:00:00.000 (UTC+1)'
    );
  });
});

describe('TimestampTooltip', () => {
  const timestamp = 1570720000123; // Oct 10, 2019, 08:06:40.123 (UTC-7)

  beforeAll(() => {
    // mock Date.now
    mockNow(1570737000000);

    moment.tz.setDefault('America/Los_Angeles');
  });

  afterAll(() => moment.tz.setDefault(''));

  it('should render component with relative time in body and absolute time in tooltip', () => {
    expect(shallow(<TimestampTooltip time={timestamp} />))
      .toMatchInlineSnapshot(`
      <EuiToolTip
        content="Oct 10, 2019, 08:06:40.123 (UTC-7)"
        delay="regular"
        position="top"
      >
        5 hours ago
      </EuiToolTip>
    `);
  });

  it('should format with precision in milliseconds by default', () => {
    expect(
      shallow(<TimestampTooltip time={timestamp} />)
        .find('EuiToolTip')
        .prop('content')
    ).toBe('Oct 10, 2019, 08:06:40.123 (UTC-7)');
  });

  it('should format with precision in seconds', () => {
    expect(
      shallow(<TimestampTooltip time={timestamp} precision="seconds" />)
        .find('EuiToolTip')
        .prop('content')
    ).toBe('Oct 10, 2019, 08:06:40 (UTC-7)');
  });

  it('should format with precision in minutes', () => {
    expect(
      shallow(<TimestampTooltip time={timestamp} precision="minutes" />)
        .find('EuiToolTip')
        .prop('content')
    ).toBe('Oct 10, 2019, 08:06 (UTC-7)');
  });

  it('should format with precision in days', () => {
    expect(
      shallow(<TimestampTooltip time={timestamp} precision="days" />)
        .find('EuiToolTip')
        .prop('content')
    ).toBe('Oct 10, 2019 (UTC-7)');
  });
});

describe('asRelativeDateRange', () => {
  it('should return the range formatted with minutes precision', () => {
    moment.tz.setDefault('Europe/Copenhagen');
    expect(asRelativeDateRange(1572266880000, 1572272640000, 'minutes')).toBe(
      'Oct 28, 2019, 13:48 - 15:24 (UTC+1)'
    );
  });
  it('should return the range formatted with seconds precision', () => {
    moment.tz.setDefault('Europe/Copenhagen');
    expect(asRelativeDateRange(1572266880000, 1572272640000, 'seconds')).toBe(
      'Oct 28, 2019, 13:48:00 - 15:24:00 (UTC+1)'
    );
  });
  it('should return the range formatted with milliseconds precision', () => {
    moment.tz.setDefault('Europe/Copenhagen');
    expect(
      asRelativeDateRange(1572266880000, 1572272640000, 'milliseconds')
    ).toBe('Oct 28, 2019, 13:48:00.000 - 15:24:00.000 (UTC+1)');
  });
  it('should return the range formatted with milliseconds precision and minus for timezones with negative UTC offset', () => {
    moment.tz.setDefault('America/Los_Angeles');
    expect(
      asRelativeDateRange(1572266880000, 1572272640000, 'milliseconds')
    ).toBe('Oct 28, 2019, 05:48:00.000 - 07:24:00.000 (UTC-7)');
  });
});
