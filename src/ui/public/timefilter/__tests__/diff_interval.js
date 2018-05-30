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
import ngMock from 'ng_mock';
import { TimefilterLibDiffIntervalProvider } from '../lib/diff_interval';

describe('Timefilter service', function () {
  describe('Refresh interval diff watcher', function () {

    let fn;
    let update;
    let fetch;
    let timefilter;

    beforeEach(ngMock.module('kibana'));

    beforeEach(ngMock.inject(function (Private) {
      update = sinon.spy();
      fetch = sinon.spy();
      timefilter = {
        refreshInterval: {
          pause: false,
          value: 0
        },
        emit: function (eventType) {
          if (eventType === 'update') update();
          if (eventType === 'fetch') fetch();
        }
      };

      fn = Private(TimefilterLibDiffIntervalProvider)(timefilter);
    }));

    it('not emit anything if nothing has changed', function () {
      timefilter.refreshInterval = { pause: false, value: 0 };
      fn();
      expect(update.called).to.be(false);
      expect(fetch.called).to.be(false);
    });

    it('emit only an update when paused', function () {
      timefilter.refreshInterval = { pause: true, value: 5000 };
      fn();
      expect(update.called).to.be(true);
      expect(fetch.called).to.be(false);
    });

    it('emit update, not fetch, when switching to value: 0', function () {
      timefilter.refreshInterval = { pause: false, value: 5000 };
      fn();
      expect(update.calledOnce).to.be(true);
      expect(fetch.calledOnce).to.be(true);
      timefilter.refreshInterval = { pause: false, value: 0 };
      fn();
      expect(update.calledTwice).to.be(true);
      expect(fetch.calledTwice).to.be(false);
    });

    it('should emit update, not fetch, when moving from unpaused to paused', function () {
      timefilter.refreshInterval = { pause: false, value: 5000 };
      fn();
      expect(update.calledOnce).to.be(true);
      expect(fetch.calledOnce).to.be(true);
      timefilter.refreshInterval = { pause: true, value: 5000 };
      fn();
      expect(update.calledTwice).to.be(true);
      expect(fetch.calledTwice).to.be(false);
    });

    it('should emit update and fetch when unpaused', function () {
      timefilter.refreshInterval = { pause: true, value: 5000 };
      fn();
      expect(update.calledOnce).to.be(true);
      expect(fetch.calledOnce).to.be(false);
      timefilter.refreshInterval = { pause: false, value: 5000 };
      fn();
      expect(update.calledTwice).to.be(true);
      expect(fetch.calledOnce).to.be(true);
    });

  });
});
