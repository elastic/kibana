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
import { leastCommonInterval } from '../../lib/least_common_interval';

describe('leastCommonInterval', () => {
  it('should correctly return lowest common interval for fixed units', () => {
    expect(leastCommonInterval('1ms', '1s')).to.be('1s');
    expect(leastCommonInterval('500ms', '1s')).to.be('1s');
    expect(leastCommonInterval('1000ms', '1s')).to.be('1s');
    expect(leastCommonInterval('1500ms', '1s')).to.be('3s');
    expect(leastCommonInterval('1234ms', '1s')).to.be('617s');
    expect(leastCommonInterval('1s', '2m')).to.be('2m');
    expect(leastCommonInterval('300s', '2m')).to.be('10m');
    expect(leastCommonInterval('1234ms', '7m')).to.be('4319m');
    expect(leastCommonInterval('45m', '2h')).to.be('6h');
    expect(leastCommonInterval('12h', '4d')).to.be('4d');
    expect(leastCommonInterval('  20 h', '7d')).to.be('35d');
  });

  it('should correctly return lowest common interval for calendar units', () => {
    expect(leastCommonInterval('1m', '1h')).to.be('1h');
    expect(leastCommonInterval('1h', '1d')).to.be('1d');
    expect(leastCommonInterval('1d', '1w')).to.be('1w');
    expect(leastCommonInterval('1w', '1M')).to.be('1M');
    expect(leastCommonInterval('1M', '1q')).to.be('1q');
    expect(leastCommonInterval('1q', '1y')).to.be('1y');
    expect(leastCommonInterval('1M', '1m')).to.be('1M');
    expect(leastCommonInterval('1y', '1w')).to.be('1y');
  });

  it('should throw an error for intervals of different types', () => {
    expect(leastCommonInterval)
      .withArgs('60 s', '1m')
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs('1d', '7d')
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs('1h', '3d')
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs('7d', '1w')
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs('1M', '1000ms')
      .to.throwError();
  });

  it('should throw an error for invalid intervals', () => {
    expect(leastCommonInterval)
      .withArgs()
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs({})
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs({}, {})
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs(123, '456')
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs('foo', 'bar')
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs('0h', '1h')
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs('0.5h', '1h')
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs('5w', '1h')
      .to.throwError();
    expect(leastCommonInterval)
      .withArgs('2M', '4w')
      .to.throwError();
  });
});
