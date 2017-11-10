import $ from 'ui/jquery';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import { StubLogstashIndexPatternProvider } from 'ui/index_patterns/__tests__/stubs';
import { StubSearchSourceProvider } from 'ui/courier/__tests__/stubs';
import { StubState } from 'ui/state_management/__tests__/stubs';
import { AggResponseIndexProvider } from 'ui/agg_response';
import { oneRangeBucket } from 'ui/agg_response/__tests__/fixtures';
import { createStubUiState } from './stubs';

describe('visualization_editor directive', function () {
  let $rootScope;
  let $compile;
  let $scope;
  let $el;
  let Vis;
  let indexPattern;
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
    Vis = Private(VisProvider);
    appState = new StubState({ filters: [] });
    appState.toJSON = () => { return {}; };
    indexPattern = Private(StubLogstashIndexPatternProvider);
    searchSource = Private(StubSearchSourceProvider);
    aggResponse = Private(AggResponseIndexProvider);

    const requiresSearch = false;
    vis = new CreateVis(null, requiresSearch);
    init(vis, oneRangeBucket);
    $timeout.flush();
    $timeout.verifyNoPendingTasks();
  }));

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    $rootScope.vis = vis;
    $rootScope.visData = aggResponse.tabify(vis, esResponse);
    $rootScope.uiState = createStubUiState();
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
    expect(renderComplete).to.equal(1);
  });
});
