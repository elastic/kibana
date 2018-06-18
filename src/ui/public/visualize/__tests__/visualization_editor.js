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

import $ from 'jquery';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from '../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import FixturesStubbedSearchSourceProvider from 'fixtures/stubbed_search_source';
import MockState from 'fixtures/mock_state';
import { AggResponseIndexProvider } from '../../agg_response';

describe('visualization_editor directive', function () {
  let $rootScope;
  let $compile;
  let $scope;
  let $el;
  let Vis;
  let indexPattern;
  let fixtures;
  let searchSource;
  let appState;
  let $timeout;
  let vis;
  let aggResponse;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    $timeout = $injector.get('$timeout');
    fixtures = require('fixtures/fake_hierarchical_data');
    Vis = Private(VisProvider);
    appState = new MockState({ filters: [] });
    appState.toJSON = () => { return {}; };
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    searchSource = Private(FixturesStubbedSearchSourceProvider);
    aggResponse = Private(AggResponseIndexProvider);

    const requiresSearch = false;
    vis = new CreateVis(null, requiresSearch);
    init(vis, fixtures.oneRangeBucket);
    $timeout.flush();
    $timeout.verifyNoPendingTasks();
  }));

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    $rootScope.vis = vis;
    $rootScope.visData = aggResponse.tabify(vis.getAggConfig().getResponseAggs(), esResponse, {
      isHierarchical: vis.isHierarchical()
    });
    $rootScope.uiState = require('fixtures/mock_ui_state');
    $rootScope.searchSource = searchSource;
    $el = $('<visualization-editor vis="vis" vis-data="visData" ui-state="uiState" search-source="searchSource">');
    $compile($el)($rootScope);
    $rootScope.$apply();

    $scope = $el.isolateScope();
  }

  function CreateVis(params, requiresSearch) {
    const vis = new Vis(indexPattern, {
      type: 'table',
      params: params || {},
      aggs: [
        { type: 'count', schema: 'metric' },
        {
          type: 'range',
          schema: 'bucket',
          params: {
            field: 'bytes',
            ranges: [
              { from: 0, to: 1000 },
              { from: 1000, to: 2000 }
            ]
          }
        }
      ]
    });

    vis.type.requestHandler = requiresSearch ? 'default' : 'none';
    vis.type.responseHandler = 'none';
    vis.type.requiresSearch = requiresSearch;
    return vis;
  }

  it('calls render complete when editor is rendered', function () {
    let renderComplete = 0;
    $scope.renderFunction = () => {
      renderComplete++;
    };

    $scope.$emit('render');
    $scope.$apply();
    $timeout.flush();
    $timeout.verifyNoPendingTasks();
    expect(renderComplete).to.equal(1);
  });
});
