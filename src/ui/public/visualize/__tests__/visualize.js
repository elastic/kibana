import $ from 'jquery';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import FixturesStubbedSearchSourceProvider from 'fixtures/stubbed_search_source';
describe('visualize directive', function () {
  let $rootScope;
  let $compile;
  let $scope;
  let $el;
  let Vis;
  let indexPattern;
  let fixtures;
  let searchSource;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    fixtures = require('fixtures/fake_hierarchical_data');
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    searchSource = Private(FixturesStubbedSearchSourceProvider);
  }));

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    $rootScope.vis = vis;
    $rootScope.esResponse = esResponse;
    $rootScope.uiState = require('fixtures/mock_ui_state');
    $rootScope.searchSource = searchSource;
    $el = $('<visualize vis="vis" search-source="searchSource" es-resp="esResponse" ui-state="uiState">');
    $compile($el)($rootScope);
    $rootScope.$apply();

    $scope = $el.isolateScope();
  }

  function CreateVis(params, requiresSearch) {
    return new Vis(indexPattern, {
      type: 'table',
      requiresSearch: requiresSearch,
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
  }

  it('searchSource.onResults should not be called when requiresSearch is false', function () {
    const requiresSearch = false;
    init(new CreateVis(null, requiresSearch), fixtures.oneRangeBucket);

    searchSource.crankResults();
    $scope.$digest();
    expect(searchSource.getOnResultsCount()).to.be(0);
  });
});
