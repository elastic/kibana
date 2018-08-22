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

import { parseInterval, parseEsInterval } from '../parse_interval';
import expect from 'expect.js';

describe('parseInterval', function () {

  describe('parseInterval()', function () {
    it('should correctly parse an interval containing unit and value', function () {
      let duration = parseInterval('1d');
      expect(duration.as('d')).to.be(1);

      duration = parseInterval('2y');
      expect(duration.as('y')).to.be(2);

      duration = parseInterval('5M');
      expect(duration.as('M')).to.be(5);

      duration = parseInterval('5m');
      expect(duration.as('m')).to.be(5);

      duration = parseInterval('250ms');
      expect(duration.as('ms')).to.be(250);

      duration = parseInterval('100s');
      expect(duration.as('s')).to.be(100);

      duration = parseInterval('23d');
      expect(duration.as('d')).to.be(23);

      duration = parseInterval('52w');
      expect(duration.as('w')).to.be(52);
    });

    it('should correctly parse fractional intervals containing unit and value', function () {
      let duration = parseInterval('1.5w');
      expect(duration.as('w')).to.be(1.5);

      duration = parseInterval('2.35y');
      expect(duration.as('y')).to.be(2.35);
    });

    it('should correctly bubble up intervals which are less than 1', function () {
      let duration = parseInterval('0.5y');
      expect(duration.as('d')).to.be(183);

      duration = parseInterval('0.5d');
      expect(duration.as('h')).to.be(12);
    });

    it('should correctly parse a unit in an interval only', function () {
      let duration = parseInterval('ms');
      expect(duration.as('ms')).to.be(1);

      duration = parseInterval('d');
      expect(duration.as('d')).to.be(1);

      duration = parseInterval('m');
      expect(duration.as('m')).to.be(1);

      duration = parseInterval('y');
      expect(duration.as('y')).to.be(1);

      duration = parseInterval('M');
      expect(duration.as('M')).to.be(1);
    });

    it('should return null for an invalid interval', function () {
      let duration = parseInterval('');
      expect(duration).to.not.be.ok();

      duration = parseInterval(null);
      expect(duration).to.not.be.ok();

      duration = parseInterval('234asdf');
      expect(duration).to.not.be.ok();
    });
  });

  describe('parseEsInterval()', function () {
    it('should correctly parse an interval containing unit and single value', function () {
      expect(parseEsInterval('1ms')).to.eql({ value: 1, unit: 'ms', type: 'fixed' });
      expect(parseEsInterval('1s')).to.eql({ value: 1, unit: 's', type: 'fixed' });
      expect(parseEsInterval('1m')).to.eql({ value: 1, unit: 'm', type: 'calendar' });
      expect(parseEsInterval('1h')).to.eql({ value: 1, unit: 'h', type: 'calendar' });
      expect(parseEsInterval('1d')).to.eql({ value: 1, unit: 'd', type: 'calendar' });
      expect(parseEsInterval('1w')).to.eql({ value: 1, unit: 'w', type: 'calendar' });
      expect(parseEsInterval('1M')).to.eql({ value: 1, unit: 'M', type: 'calendar' });
      expect(parseEsInterval('1q')).to.eql({ value: 1, unit: 'q', type: 'calendar' });
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
      expect(parseEsInterval).withArgs('2q').to.throwError();
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
});
