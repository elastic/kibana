import $ from 'ui/jquery';
import _ from 'ui/lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import { StubLogstashIndexPatternProvider } from 'ui/index_patterns/__tests__/stubs';
import { StubSearchSourceProvider } from 'ui/courier/__tests__/stubs';
import { StubState } from 'ui/state_management/__tests__/stubs';
import { oneRangeBucket } from 'ui/agg_response/__tests__/fixtures';
import { createStubUiState } from './stubs';

describe('visualize spy directive', function () {
  let $rootScope;
  let $compile;
  let $el;
  let Vis;
  let indexPattern;
  let searchSource;
  let appState;
  let vis;

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
    vis = new CreateVis(null, requiresSearch);
    init(vis, oneRangeBucket);
  }));

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });
    $rootScope.spy = {};
    $rootScope.vis = vis;
    $rootScope.esResponse = esResponse;
    $rootScope.uiState = createStubUiState();
    $rootScope.searchSource = searchSource;
    $el = $('<visualize-spy>');
    $compile($el)($rootScope);
    $rootScope.$apply();
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

  it('toggleDisplay toggles spy display', () => {
    $rootScope.toggleDisplay();
    $rootScope.$apply();
    let mode = _.get($rootScope.spy, 'mode.name');
    expect(mode).to.equal('table');

    $rootScope.toggleDisplay();
    $rootScope.$apply();
    mode = _.get($rootScope.spy, 'mode.name');
    expect(mode).to.be.undefined;
  });

  it('toggleFullPage toggles full page display', () => {
    $rootScope.spy = { mode: { name: 'table' } };
    $rootScope.toggleFullPage();
    $rootScope.$apply();
    let mode = _.get($rootScope.spy, 'mode.fill');
    expect(mode).to.equal(true);

    $rootScope.toggleFullPage();
    $rootScope.$apply();
    mode = _.get($rootScope.spy, 'mode.fill');
    expect(mode).to.equal(false);
  });

  it('onSpyModeChange updates the spy display mode', () => {
    $rootScope.selectedModeName = 'table';
    $rootScope.onSpyModeChange();
    $rootScope.$apply();
    const mode = _.get($rootScope.spy, 'mode.name');
    expect(mode).to.equal('table');
  });
});
