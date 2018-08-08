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

import expect from 'expect.js';
import moment from 'moment-timezone';
import { prettyDuration } from './pretty_duration';

const config = {};
moment.tz.setDefault('UTC');
config.dateFormat = 'MMMM Do YYYY, HH:mm:ss.SSS';
config['timepicker:quickRanges'] = [
  {
    from: 'now-15m',
    to: 'now',
    display: 'quick range 15 minutes custom display',
  }
];
const getConfig = (key) => config[key];

test('quick range', () => {
  const timeFrom = 'now-15m';
  const timeTo = 'now';
  expect(prettyDuration(timeFrom, timeTo, getConfig)).to.be('quick range 15 minutes custom display');
});

describe('relative range', () => {
  test('from = now', () => {
    const timeFrom = 'now-1M';
    const timeTo = 'now';
    expect(prettyDuration(timeFrom, timeTo, getConfig)).to.be('Last 1M');
  });

  test('from is in past', () => {
    const timeFrom = 'now-17m';
    const timeTo = 'now-15m';
    expect(prettyDuration(timeFrom, timeTo, getConfig)).to.be('~ 17 minutes ago to ~ 15 minutes ago');
  });
});

describe('absolute range', () => {
  test('dates in string format)', () => {
    const timeFrom = '2018-01-17T18:57:57.149Z';
    const timeTo = '2018-01-17T20:00:00.000Z';
    expect(prettyDuration(timeFrom, timeTo, getConfig)).to.be('January 17th 2018, 18:57:57.149 to January 17th 2018, 20:00:00.000');
  });

  test('dates as moment objects', () => {
    const timeFrom = moment('2018-01-17T18:57:57.149Z');
    const timeTo = moment('2018-01-17T20:00:00.000Z');
    expect(prettyDuration(timeFrom, timeTo, getConfig)).to.be('January 17th 2018, 18:57:57.149 to January 17th 2018, 20:00:00.000');
  });
});


