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

import ngMock from 'ng_mock';
import expect from 'expect.js';
import { VislibSeriesResponseHandlerProvider } from '../../response_handlers/vislib';
import { VisProvider } from '../..';
import fixtures from 'fixtures/fake_hierarchical_data';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

const rowAgg = [
  { id: 'agg_1', type: 'avg', schema: 'metric', params: { field: 'bytes' } },
  { id: 'agg_2', type: 'terms', schema: 'split', params: { field: 'extension', rows: true } },
  { id: 'agg_3', type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
  { id: 'agg_4', type: 'terms', schema: 'segment', params: { field: 'geo.src' } }
];


describe('Basic Response Handler', function () {
  let basicResponseHandler;
  let indexPattern;
  let Vis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    basicResponseHandler = Private(VislibSeriesResponseHandlerProvider).handler;
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  it('calls hierarchical converter if isHierarchical is set to true', () => {
    const vis = new Vis(indexPattern, {
      type: 'pie',
      aggs: rowAgg
    });
    basicResponseHandler(vis, fixtures.threeTermBuckets).then(data => {
      expect(data).to.not.be.an('undefined');
      expect(data.rows[0].slices).to.not.be.an('undefined');
      expect(data.rows[0].series).to.be.an('undefined');
    });
  });

  it('returns empty object if conversion failed', () => {
    basicResponseHandler({}, {}).then(data => {
      expect(data).to.not.be.an('undefined');
      expect(data.rows).to.equal([]);
    });
  });

  it('returns converted data', () => {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: rowAgg.slice(0, 3)
    });
    basicResponseHandler(vis, fixtures.threeTermBuckets).then(data => {
      expect(data).to.not.be.an('undefined');
      expect(data.rows[0].slices).to.be.an('undefined');
      expect(data.rows[0].series).to.not.be.an('undefined');
    });
  });

});
