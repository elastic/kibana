import $ from 'jquery';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from '../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('visualize_legend directive', function () {
  let $rootScope;
  let $compile;
  let $timeout;
  let $el;
  let Vis;
  let indexPattern;
  let fixtures;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    $timeout = $injector.get('$timeout');
    fixtures = require('fixtures/fake_hierarchical_data');
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    $rootScope.vis = vis;
    $rootScope.visData = esResponse;
    $rootScope.uiState = require('fixtures/mock_ui_state');
    $el = $('<visualize-legend>');
    $compile($el)($rootScope);
    $rootScope.$apply();
  }

  function CreateVis(params, requiresSearch) {
    const vis = new Vis(indexPattern, {
      type: 'line',
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

  it('calls hightlight handler when hightlight function is called', () => {
    const requiresSearch = false;
    const vis = new CreateVis(null, requiresSearch);
    init(vis, fixtures.oneRangeBucket);
    let highlight = 0;
    _.set(vis, 'vislibVis.handler.highlight', () => { highlight++; });
    $rootScope.highlight({ currentTarget: null });
    expect(highlight).to.equal(1);
  });

  it('calls unhighlight handler when unhighlight function is called', () => {
    const requiresSearch = false;
    const vis = new CreateVis(null, requiresSearch);
    init(vis, fixtures.oneRangeBucket);
    let unhighlight = 0;
    _.set(vis, 'vislibVis.handler.unHighlight', () => { unhighlight++; });
    $rootScope.unhighlight({ currentTarget: null });
    expect(unhighlight).to.equal(1);
  });

  describe('setColor function', () => {
    beforeEach(() => {
      const requiresSearch = false;
      const vis = new CreateVis(null, requiresSearch);
      init(vis, fixtures.oneRangeBucket);
    });

    it('sets the color in the UI state', () => {
      $rootScope.setColor('test', '#ffffff');
      const colors = $rootScope.uiState.get('vis.colors');
      expect(colors.test).to.equal('#ffffff');
    });
  });

  describe('toggleLegend function', () => {
    let vis;

    beforeEach(() => {
      const requiresSearch = false;
      vis = new CreateVis(null, requiresSearch);
      init(vis, fixtures.oneRangeBucket);
    });

    it('sets the color in the UI state', () => {
      $rootScope.open = true;
      $rootScope.toggleLegend();
      $rootScope.$digest();
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      let legendOpen = $rootScope.uiState.get('vis.legendOpen');
      expect(legendOpen).to.equal(false);

      $rootScope.toggleLegend();
      $rootScope.$digest();
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      legendOpen = $rootScope.uiState.get('vis.legendOpen');
      expect(legendOpen).to.equal(true);
    });
  });

  it('does not update scope.data if visData is null', () => {
    $rootScope.visData = null;
    $rootScope.$digest();
    expect($rootScope.data).to.not.equal(null);
  });

  it('works without handler set', () => {
    const requiresSearch = false;
    const vis = new CreateVis(null, requiresSearch);
    vis.vislibVis = {};
    init(vis, fixtures.oneRangeBucket);
    expect(() => {
      $rootScope.highlight({ currentTarget: null });
      $rootScope.unhighlight({ currentTarget: null });
    }).to.not.throwError();
  });

  it('getToggleLegendClasses returns correct class', () => {
    const requiresSearch = false;
    const vis = new CreateVis(null, requiresSearch);
    init(vis, fixtures.oneRangeBucket);

    $rootScope.vis.params.legendPosition = 'top';
    $rootScope.open = true;
    expect($rootScope.getToggleLegendClasses()).to.equal('fa-chevron-circle-up');
    $rootScope.open = false;
    expect($rootScope.getToggleLegendClasses()).to.equal('fa-chevron-circle-down');

    $rootScope.vis.params.legendPosition = 'bottom';
    $rootScope.open = true;
    expect($rootScope.getToggleLegendClasses()).to.equal('fa-chevron-circle-down');
    $rootScope.open = false;
    expect($rootScope.getToggleLegendClasses()).to.equal('fa-chevron-circle-up');

    $rootScope.vis.params.legendPosition = 'left';
    $rootScope.open = true;
    expect($rootScope.getToggleLegendClasses()).to.equal('fa-chevron-circle-left');
    $rootScope.open = false;
    expect($rootScope.getToggleLegendClasses()).to.equal('fa-chevron-circle-right');

    $rootScope.vis.params.legendPosition = 'right';
    $rootScope.open = true;
    expect($rootScope.getToggleLegendClasses()).to.equal('fa-chevron-circle-right');
    $rootScope.open = false;
    expect($rootScope.getToggleLegendClasses()).to.equal('fa-chevron-circle-left');
  });

});
