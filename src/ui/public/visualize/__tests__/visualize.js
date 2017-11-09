import $ from 'ui/jquery';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import { StubLogstashIndexPatternProvider } from 'ui/index_patterns/__tests__/stubs';
import { StubSearchSourceProvider } from 'ui/courier/__tests__/stubs';
import { StubState } from 'ui/state_management/__tests__/stubs';
import { oneRangeBucket } from 'ui/agg_response/__tests__/fixtures';
import { createStubUiState } from './stubs';

describe('visualize directive', function () {
  let $rootScope;
  let $compile;
  let $scope;
  let $el;
  let Vis;
  let indexPattern;
  let searchSource;
  let appState;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    Vis = Private(VisProvider);
    appState = new StubState({ filters: [] });
    appState.toJSON = () => { return {}; };
    indexPattern = Private(StubLogstashIndexPatternProvider);
    searchSource = Private(StubSearchSourceProvider);

    const requiresSearch = false;
    init(new CreateVis(null, requiresSearch), oneRangeBucket);
  }));

  afterEach(() => {
    $scope.$destroy();
  });

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    $rootScope.vis = vis;
    $rootScope.esResponse = esResponse;
    $rootScope.uiState = createStubUiState();
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

  it('renderComplete is triggered on the element', () => {
    let counter = 0;
    $el.on('renderComplete', () => {
      counter++;
    });
    $scope.$emit('renderComplete');
    expect(counter).to.equal(1);
  });

});
