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
import { diffIntervalFactory } from '../lib/diff_interval';

describe('Refresh interval diff watcher', () => {

  let diffInterval;
  let update;
  let fetch;
  let timefilter;

  beforeEach(()  => {
    update = sinon.spy();
    fetch = sinon.spy();
    timefilter = {
      refreshInterval: {
        pause: false,
        value: 0
      },
      emit: (eventType) => {
        if (eventType === 'update') update();
        if (eventType === 'fetch') fetch();
      }
    };

    diffInterval = diffIntervalFactory(timefilter);
  });

  test('not emit anything if nothing has changed', () => {
    timefilter.refreshInterval = { pause: false, value: 0 };
    diffInterval();
    expect(update.called).to.be(false);
    expect(fetch.called).to.be(false);
  });

  test('emit only an update when paused', () => {
    timefilter.refreshInterval = { pause: true, value: 5000 };
    diffInterval();
    expect(update.called).to.be(true);
    expect(fetch.called).to.be(false);
  });

  test('emit update, not fetch, when switching to value: 0', () => {
    timefilter.refreshInterval = { pause: false, value: 5000 };
    diffInterval();
    expect(update.calledOnce).to.be(true);
    expect(fetch.calledOnce).to.be(true);
    timefilter.refreshInterval = { pause: false, value: 0 };
    diffInterval();
    expect(update.calledTwice).to.be(true);
    expect(fetch.calledTwice).to.be(false);
  });

  test('should emit update, not fetch, when moving from unpaused to paused', () => {
    timefilter.refreshInterval = { pause: false, value: 5000 };
    diffInterval();
    expect(update.calledOnce).to.be(true);
    expect(fetch.calledOnce).to.be(true);
    timefilter.refreshInterval = { pause: true, value: 5000 };
    diffInterval();
    expect(update.calledTwice).to.be(true);
    expect(fetch.calledTwice).to.be(false);
  });

  test('should emit update and fetch when unpaused', () => {
    timefilter.refreshInterval = { pause: true, value: 5000 };
    diffInterval();
    expect(update.calledOnce).to.be(true);
    expect(fetch.calledOnce).to.be(false);
    timefilter.refreshInterval = { pause: false, value: 5000 };
    diffInterval();
    expect(update.calledTwice).to.be(true);
    expect(fetch.calledOnce).to.be(true);
  });

});
