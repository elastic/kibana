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
import sinon from 'sinon';
import { VisProvider } from '../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import FixturesStubbedSearchSourceProvider from 'fixtures/stubbed_search_source';
import MockState from 'fixtures/mock_state';
import { PersistedState } from '../../persisted_state';

describe('visualize directive', function () {
  let $rootScope;
  let $compile;
  let $scope;
  let $el;
  let Vis;
  let indexPattern;
  let fixtures;
  let searchSource;
  let appState;
  let uiState;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    fixtures = require('fixtures/fake_hierarchical_data');
    Vis = Private(VisProvider);
    appState = new MockState({ filters: [] });
    appState.toJSON = () => { return {}; };
    uiState = new PersistedState({});
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    searchSource = Private(FixturesStubbedSearchSourceProvider);

    init(new CreateVis(null), fixtures.oneRangeBucket);
  }));

  afterEach(() => {
    $scope.$destroy();
  });

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    $rootScope.vis = vis;
    $rootScope.esResponse = esResponse;
    $rootScope.uiState = uiState;
    $rootScope.appState = appState;
    $rootScope.appState.vis = vis.getState();
    $rootScope.searchSource = searchSource;
    $rootScope.savedObject = {
      vis: vis,
      searchSource: searchSource
    };
    $el = $('<visualize saved-obj="savedObject" ui-state="uiState" app-state="appState">');
    $compile($el)($rootScope);
    $rootScope.$apply();

    $scope = $el.isolateScope();
  }

  function CreateVis(params, requestHandler = 'none') {
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

    vis.type.requestHandler = requestHandler;
    vis.type.responseHandler = 'none';
    vis.type.requiresSearch = false;
    return vis;
  }

  it('searchSource.onResults should not be called when requiresSearch is false', function () {
    searchSource.crankResults();
    $scope.$digest();
    expect(searchSource.getOnResultsCount()).to.be(0);
  });

  it('fetches new data on update event', () => {
    let counter = 0;
    $scope.fetch = () => { counter++; };
    $scope.vis.emit('update');
    expect(counter).to.equal(1);
  });

  it('updates the appState in editor mode on update event', () => {
    $scope.editorMode = true;
    $scope.appState.vis = {};
    $scope.vis.emit('update');
    expect($scope.appState.vis).to.not.equal({});
  });

  describe('request handler', () => {

    const requestHandler = sinon.stub().resolves();

    /**
     * Asserts that a specific parameter had a specific value in the last call to the requestHandler.
     */
    function assertParam(obj) {
      sinon.assert.calledWith(requestHandler, sinon.match.any, sinon.match(obj));
    }

    /**
     * Wait for the next $scope.fetch call.
     * Since we use an old lodash version we cannot use fake timers here.
     */
    function waitForFetch() {
      return new Promise(resolve => { setTimeout(resolve, 150); });
    }

    beforeEach(() => {
      init(new CreateVis(null, requestHandler), fixtures.oneRangeBucket);
    });

    afterEach(() => {
      requestHandler.resetHistory();
    });

    describe('forceFetch param', () => {
      it('should be true if triggered via vis.forceReload', async () => {
        $scope.vis.forceReload();
        await waitForFetch();
        sinon.assert.calledOnce(requestHandler);
        assertParam({ forceFetch: true });
      });

      it('should be true if triggered via courier:searchRefresh event', async () => {
        $scope.$emit('courier:searchRefresh');
        await waitForFetch();
        sinon.assert.calledOnce(requestHandler);
        assertParam({ forceFetch: true });
      });

      it('should be false if triggered via resize event', async () => {
        $el.width(400);
        $el.height(500);
        await waitForFetch();
        sinon.assert.calledOnce(requestHandler);
        assertParam({ forceFetch: false });
      });

      it('should be false if triggered via uiState change', async () => {
        uiState.set('foo', 'bar');
        await waitForFetch();
        sinon.assert.calledOnce(requestHandler);
        assertParam({ forceFetch: false });
      });

      it('should be true if at least one trigger required it to be true', async () => {
        $el.width(400);
        $scope.vis.forceReload(); // This requires forceFetch to be true
        uiState.set('foo', 'bar');
        await waitForFetch();
        sinon.assert.calledOnce(requestHandler);
        assertParam({ forceFetch: true });
      });
    });
  });

});
