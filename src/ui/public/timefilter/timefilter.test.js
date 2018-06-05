/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('ui/chrome',
  () => ({
    getUiSettingsClient: () => {
      return {
        get: (key) => {
          switch(key) {
            case 'timepicker:timeDefaults':
              return { from: 'now-15m', to: 'now', mode: 'quick' };
            case 'timepicker:refreshIntervalDefaults':
              return { display: 'Off', pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        }
      };
    },
  }), { virtual: true });

jest.mock('./lib/parse_querystring',
  () => ({
    parseQueryString: () => {
      return {
        forceNow: '1999-01-01T00:00:00.000Z'
      };
    },
  }), { virtual: true });

import sinon from 'sinon';
import expect from 'expect.js';
import { timefilter } from './timefilter';

describe('calculateBounds', () => {

  const fifteenMinutesInMilliseconds = 15 * 60 * 1000;
  const clockNowTicks = new Date(2000, 1, 1, 0, 0, 0, 0).valueOf();

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers(clockNowTicks);
  });

  afterEach(() => {
    clock.restore();
  });

  test('uses clock time by default', () => {
    const timeRange = {
      from: 'now-15m',
      to: 'now'
    };

    const result = timefilter.calculateBounds(timeRange);
    expect(result.min.valueOf()).to.eql(clockNowTicks - fifteenMinutesInMilliseconds);
    expect(result.max.valueOf()).to.eql(clockNowTicks);
  });

  test('uses forceNow string', () => {
    const timeRange = {
      from: 'now-15m',
      to: 'now'
    };

    const forceNowString = '1999-01-01T00:00:00.000Z';
    const result = timefilter.calculateBounds(timeRange);

    const forceNowTicks = Date.parse(forceNowString);
    expect(result.min.valueOf()).to.eql(forceNowTicks - fifteenMinutesInMilliseconds);
    expect(result.max.valueOf()).to.eql(forceNowTicks);
  });

  test(`throws Error if forceNow can't be parsed`, () => {
    const timeRange = {
      from: 'now-15m',
      to: 'now'
    };

    /*Object.defineProperty(window.location, 'href', {
      writable: true,
      value: `?forceNow=malformed%20string`,
    });*/
    expect(() => timefilter.calculateBounds(timeRange)).to.throwError();
  });
});

