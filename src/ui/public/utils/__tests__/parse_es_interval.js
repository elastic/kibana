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

import { parseEsInterval } from '../parse_es_interval';
import expect from 'expect.js';

describe('parseEsInterval', function () {
  it('should correctly parse an interval containing unit and single value', function () {
    expect(parseEsInterval('1ms')).to.eql({ value: 1, unit: 'ms', type: 'fixed' });
    expect(parseEsInterval('1s')).to.eql({ value: 1, unit: 's', type: 'fixed' });
    expect(parseEsInterval('1m')).to.eql({ value: 1, unit: 'm', type: 'calendar' });
    expect(parseEsInterval('1h')).to.eql({ value: 1, unit: 'h', type: 'calendar' });
    expect(parseEsInterval('1d')).to.eql({ value: 1, unit: 'd', type: 'calendar' });
    expect(parseEsInterval('1w')).to.eql({ value: 1, unit: 'w', type: 'calendar' });
    expect(parseEsInterval('1M')).to.eql({ value: 1, unit: 'M', type: 'calendar' });
    expect(parseEsInterval('1y')).to.eql({ value: 1, unit: 'y', type: 'calendar' });
  });

  it('should correctly parse an interval containing unit and multiple value', function () {
    expect(parseEsInterval('250ms')).to.eql({ value: 250, unit: 'ms', type: 'fixed' });
    expect(parseEsInterval('90s')).to.eql({ value: 90, unit: 's', type: 'fixed' });
    expect(parseEsInterval('60m')).to.eql({ value: 60, unit: 'm', type: 'fixed' });
    expect(parseEsInterval('12h')).to.eql({ value: 12, unit: 'h', type: 'fixed' });
    expect(parseEsInterval('7d')).to.eql({ value: 7, unit: 'd', type: 'fixed' });
  });

  it('should throw an error for intervals containing calendar unit and multiple value', function () {
    expect(parseEsInterval).withArgs('4w').to.throwError();
    expect(parseEsInterval).withArgs('12M').to.throwError();
    expect(parseEsInterval).withArgs('10y').to.throwError();
  });

  it('should throw an error for invalid interval formats', function () {
    expect(parseEsInterval).withArgs('1').to.throwError();
    expect(parseEsInterval).withArgs('h').to.throwError();
    expect(parseEsInterval).withArgs('0m').to.throwError();
    expect(parseEsInterval).withArgs('0.5h').to.throwError();
    expect(parseEsInterval).withArgs().to.throwError();
    expect(parseEsInterval).withArgs({}).to.throwError();
  });
});
