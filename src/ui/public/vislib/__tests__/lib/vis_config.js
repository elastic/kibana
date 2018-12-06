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

import d3 from 'd3';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { VislibVisConfigProvider } from '../../lib/vis_config';
import '../../../persisted_state';

describe('Vislib VisConfig Class Test Suite', function () {
  let visConfig;
  let el;
  const data = {
    hits: 621,
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458
    },
    series: [
      {
        label: 'Count',
        values: [
          {
            x: 1408734060000,
            y: 8
          },
          {
            x: 1408734090000,
            y: 23
          },
          {
            x: 1408734120000,
            y: 30
          },
          {
            x: 1408734150000,
            y: 28
          },
          {
            x: 1408734180000,
            y: 36
          },
          {
            x: 1408734210000,
            y: 30
          },
          {
            x: 1408734240000,
            y: 26
          },
          {
            x: 1408734270000,
            y: 22
          },
          {
            x: 1408734300000,
            y: 29
          },
          {
            x: 1408734330000,
            y: 24
          }
        ]
      }
    ],
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count'
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    const VisConfig = Private(VislibVisConfigProvider);
    const PersistedState = $injector.get('PersistedState');
    el = d3.select('body').append('div')
      .attr('class', 'visWrapper')
      .node();

    visConfig = new VisConfig({
      type: 'point_series'
    }, data, new PersistedState(), el);
  }));

  afterEach(() => {
    el.remove();
  });

  describe('get Method', function () {
    it('should be a function', function () {
      expect(typeof visConfig.get).to.be('function');
    });

    it('should get the property', function () {
      expect(visConfig.get('el')).to.be(el);
      expect(visConfig.get('type')).to.be('point_series');
    });

    it('should return defaults if property does not exist', function () {
      expect(visConfig.get('this.does.not.exist', 'defaults')).to.be('defaults');
    });

    it('should throw an error if property does not exist and defaults were not provided', function () {
      expect(function () {
        visConfig.get('this.does.not.exist');
      }).to.throwError();
    });
  });

  describe('set Method', function () {
    it('should be a function', function () {
      expect(typeof visConfig.set).to.be('function');
    });

    it('should set a property', function () {
      visConfig.set('this.does.not.exist', 'it.does.now');
      expect(visConfig.get('this.does.not.exist')).to.be('it.does.now');
    });
  });
});
