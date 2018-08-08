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
import { prettyInterval } from './pretty_interval';

test('Off', () => {
  expect(prettyInterval(0)).to.be('Off');
});

test('seconds', () => {
  expect(prettyInterval(1000)).to.be('1 second');
  expect(prettyInterval(15000)).to.be('15 seconds');
});

test('minutes', () => {
  expect(prettyInterval(60000)).to.be('1 minute');
  expect(prettyInterval(1800000)).to.be('30 minutes');
});

test('hours', () => {
  expect(prettyInterval(3600000)).to.be('1 hour');
  expect(prettyInterval(43200000)).to.be('12 hours');
});

test('days', () => {
  expect(prettyInterval(86400000)).to.be('1 day');
  expect(prettyInterval(86400000 * 2)).to.be('2 days');
});
