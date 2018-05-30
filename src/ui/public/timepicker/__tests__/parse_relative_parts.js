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

import { parseRelativeString, parseRelativeParts } from '../parse_relative_parts';
import expect from 'expect.js';
import moment from 'moment';

describe('parseRelativeParts(from, to, relativeOptions)', () => {

  it('should parse relative string', () => {
    const results = parseRelativeString('now-2h');
    expect(results).to.have.property('count', 2);
    expect(results).to.have.property('unit', 'h');
    expect(results).to.have.property('round', false);
  });

  it('should parse now', () => {
    const results = parseRelativeString('now');
    expect(results).to.have.property('count', 0);
    expect(results).to.have.property('unit', 's');
    expect(results).to.have.property('round', false);
  });

  it('should parse set round options', () => {
    const results = parseRelativeString('now-2h/h');
    expect(results).to.have.property('round', true);
  });

  it('should parse now-2h to now-10m/m', () => {
    expect(parseRelativeParts('now-2h', 'now-10m/m')).to.eql({
      from: {
        count: 2,
        unit: 'h',
        round: false
      },
      to: {
        count: 10,
        unit: 'm',
        round: true
      }
    });
  });

  it('should parse now-2h to now+10m/m', () => {
    expect(parseRelativeParts('now-2h', 'now+10m/m')).to.eql({
      from: {
        count: 2,
        unit: 'h',
        round: false
      },
      to: {
        count: 10,
        unit: 'm+',
        round: true
      }
    });
  });

  it('should parse 3 months ago to now', () => {
    expect(parseRelativeParts(moment().subtract(3, 'M'), moment())).to.eql({
      from: {
        count: 3,
        unit: 'M',
        round: false
      },
      to: {
        count: 0,
        unit: 's',
        round: false
      }
    });
  });

  it('should parse 3 months ago to 15 minutes ago', () => {
    const from = moment().subtract(3, 'M');
    const to = moment().subtract(15, 'm');
    expect(parseRelativeParts(from, to)).to.eql({
      from: {
        count: 3,
        unit: 'M',
        round: false
      },
      to: {
        count: 15,
        unit: 'm',
        round: false
      }
    });
  });

  it('should parse 3 months ago to 2 hours from now', () => {
    const from = moment().subtract(3, 'M');
    const to = moment().add(2, 'h');
    expect(parseRelativeParts(from, to)).to.eql({
      from: {
        count: 3,
        unit: 'M',
        round: false
      },
      to: {
        count: 2,
        unit: 'h+',
        round: false
      }
    });
  });

});
