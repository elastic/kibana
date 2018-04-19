import $ from 'jquery';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from '../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import FixturesStubbedSearchSourceProvider from 'fixtures/stubbed_search_source';
import MockState from 'fixtures/mock_state';

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

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    fixtures = require('fixtures/fake_hierarchical_data');
    Vis = Private(VisProvider);
    appState = new MockState({ filters: [] });
    appState.toJSON = () => { return {}; };
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    searchSource = Private(FixturesStubbedSearchSourceProvider);

    const requiresSearch = false;
    init(new CreateVis(null, requiresSearch), fixtures.oneRangeBucket);
  }));

  afterEach(() => {
    $scope.$destroy();
  });

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    $rootScope.vis = vis;
    $rootScope.esResponse = esResponse;
    $rootScope.uiState = require('fixtures/mock_ui_state');
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

  it('sets force flag on force event', () => {
    $scope.vis.emit('reload');
    expect($scope.vis.reload).to.equal(true);
  });

});
