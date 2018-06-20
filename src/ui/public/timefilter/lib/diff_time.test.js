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

import sinon from 'sinon';
import expect from 'expect.js';
import { diffTimeFactory } from '../lib/diff_time';

describe('time diff watcher', () => {
  let diffTime;
  let update;
  let fetch;
  let timefilter;

  beforeEach(() => {
    update = sinon.spy();
    fetch = sinon.spy();
    timefilter = {
      time: {
        from: 0,
        to: 1
      },
      emit: function (eventType) {
        if (eventType === 'update') update();
        if (eventType === 'fetch') fetch();
      }
    };

    diffTime = diffTimeFactory(timefilter);
  });

  test('not emit anything if the time has not changed', () => {
    timefilter.time = { from: 0, to: 1 };
    diffTime();
    expect(update.called).to.be(false);
    expect(fetch.called).to.be(false);
  });

  test('emit update and fetch if the time has changed', () => {
    timefilter.time = { from: 5, to: 10 };
    diffTime();
    expect(update.called).to.be(true);
    expect(fetch.called).to.be(true);
  });

});
