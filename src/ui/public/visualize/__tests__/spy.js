import $ from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';
import ngMock from 'ng_mock';
import angular from 'angular';
import { VisProvider } from '../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import FixturesStubbedSearchSourceProvider from 'fixtures/stubbed_search_source';
import { uiRegistry } from '../../registry/_registry';
import { SpyModesRegistryProvider } from '../../registry/spy_modes';
import mockUiState from 'fixtures/mock_ui_state';

describe('visualize spy panel', function () {
  let $scope;
  let $compile;
  let $timeout;
  let $el;
  let visElement;
  let Vis;
  let indexPattern;
  let fixtures;
  let searchSource;
  let vis;
  let spyModeStubRegistry;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis', (PrivateProvider) => {
    spyModeStubRegistry = uiRegistry({
      name: 'spyModes',
      index: ['name'],
      order: ['order']
    });

    PrivateProvider.swap(SpyModesRegistryProvider, spyModeStubRegistry);
  }));

  beforeEach(ngMock.inject(function (Private, $injector) {
    $scope = $injector.get('$rootScope').$new();
    $timeout = $injector.get('$timeout');
    $compile = $injector.get('$compile');
    visElement = angular.element('<div>');
    visElement.width(500);
    visElement.height(500);
    fixtures = require('fixtures/fake_hierarchical_data');
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    searchSource = Private(FixturesStubbedSearchSourceProvider);
    vis = new CreateVis(null, false);
    init(vis, fixtures.oneRangeBucket);
  }));

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });
    mockUiState._reset();
    $scope.vis = vis;
    $scope.esResponse = esResponse;
    $scope.uiState = mockUiState;
    $scope.searchSource = searchSource;
    $scope.visElement = visElement;
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


  function compile() {
    const spyElem = $('<visualize-spy vis="vis" vis-element="visElement" search-source="searchSource" ui-state="uiState">');
    const $el = $compile(spyElem)($scope);
    $scope.$apply();

    $el.toggleButton = $el.find('[data-test-subj="spyToggleButton"]');
    $el.maximizedButton = $el.find('[data-test-subj="toggleSpyFullscreen"]');
    $el.panel = $el.find('[data-test-subj="spyContainer"]');
    $el.tabs = $el.find('[data-test-subj="spyModTabs"]');

    return $el;
  }

  function fillRegistryAndCompile() {
    spyModeStubRegistry.register(() => ({
      name: 'spymode1',
      display: 'SpyMode1',
      order: 1,
      template: '<div></div>',
    }));
    spyModeStubRegistry.register(() => ({
      name: 'spymode2',
      display: 'SpyMode2',
      order: 2,
      template: '<div></div>',
    }));

    $el = compile();
  }

  function openSpy(el = $el) {
    el.toggleButton.click();
  }

  // Returns an array of the title of all shown mode tabs.
  function getModeTabTitles($el) {
    const tabElems = $el.tabs.find('button').get();
    return tabElems.map(btn => btn.textContent.trim());
  }

  describe('toggle button', () => {

    it('should not be shown if no spy mode is registered', () => {
      const $el = compile();
      expect($el.toggleButton.length).to.equal(0);
    });

  });

  describe('open and closing the spy panel', () => {

    beforeEach(fillRegistryAndCompile);

    it('should show spy-panel on toggle click', () => {
      expect($el.panel.hasClass('ng-hide')).to.equal(true);
      $el.toggleButton.click();
      expect($el.panel.hasClass('ng-hide')).to.equal(false);
    });

    it('should hide spy-panel on toggle button, when opened', () => {
      $el.toggleButton.click();
      expect($el.panel.hasClass('ng-hide')).to.equal(false);
      $el.toggleButton.click();
      expect($el.panel.hasClass('ng-hide')).to.equal(true);
    });
  });

  describe('maximized mode', () => {

    beforeEach(fillRegistryAndCompile);

    it('should toggle to maximized mode when maximized button is clicked', () => {
      openSpy();
      $el.maximizedButton.click();
      expect($el.panel.hasClass('only')).to.equal(true);
      expect(visElement.hasClass('spy-only')).to.equal(true);
    });

    it('should exit maximized mode on a second click', () => {
      openSpy();
      $el.maximizedButton.click();
      expect($el.panel.hasClass('only')).to.equal(true);
      expect(visElement.hasClass('spy-only')).to.equal(true);
      $el.maximizedButton.click();
      expect($el.panel.hasClass('only')).to.equal(false);
      expect(visElement.hasClass('spy-only')).to.equal(false);
    });

    it('will be forced when vis would be too small otherwise', () => {
      visElement.height(50);
      openSpy();
      $timeout.flush();
      expect($el.panel.hasClass('only')).to.equal(true);
      expect(visElement.hasClass('spy-only')).to.equal(true);
    });

    it('should not trigger forced maximized mode, when spy is not shown', () => {
      visElement.height(50);
      compile();
      $timeout.flush();
      expect(visElement.hasClass('spy-only')).to.equal(false);
    });
  });

  describe('spy modes', () => {

    function registerRegularPanels() {
      spyModeStubRegistry.register(() => ({
        name: 'spymode2',
        display: 'SpyMode2',
        order: 2,
        template: '<div class="spymode2"></div>',
      }));
      spyModeStubRegistry.register(() => ({
        name: 'spymode1',
        display: 'SpyMode1',
        order: 1,
        template: '<div class="spymode1"></div>',
      }));
    }

    it('should show registered spy modes as tabs', () => {
      registerRegularPanels();
      const $el = compile();
      openSpy($el);
      expect($el.tabs.find('button').length).to.equal(2);
      expect(getModeTabTitles($el)).to.eql(['SpyMode1', 'SpyMode2']);
    });

    it('should by default be on the first spy mode when opening', async () => {
      registerRegularPanels();
      const $el = compile();
      openSpy($el);
      expect($el.panel.find('.spymode1').length).to.equal(1);
    });

    describe('conditional spy modes', () => {

      let filterOutSpy;

      beforeEach(() => {
        filterOutSpy = sinon.spy(() => false);
        spyModeStubRegistry.register(() => ({
          name: 'test',
          display: 'ShouldBeFiltered',
          showMode: filterOutSpy,
          order: 1,
          template: '<div></div>'
        }));
        spyModeStubRegistry.register(() => ({
          name: 'test2',
          display: 'ShouldNotBeFiltered',
          order: 2,
          template: '<div></div>'
        }));
        spyModeStubRegistry.register(() => ({
          name: 'test3',
          display: 'Test3',
          order: 3,
          showMode: () => true,
          template: '<div></div>'
        }));

        $el = compile();
        openSpy();
      });

      it('should filter out panels, that return false in showMode', () => {
        expect(getModeTabTitles($el)).not.to.include('ShouldBeFiltered');
      });

      it('should show modes without a showMode function', () => {
        expect(getModeTabTitles($el)).to.include('ShouldNotBeFiltered');
      });

      it('should show mods whose showMode returns true', () => {
        expect(getModeTabTitles($el)).to.include('Test3');
      });

      it('should pass the visualization to the showMode method', () => {
        expect(filterOutSpy.called).to.equal(true);
        expect(filterOutSpy.getCall(0).args[0]).to.equal(vis);
      });

    });

    describe('uiState', () => {
      beforeEach(fillRegistryAndCompile);

      it('should sync the active tab to the uiState', () => {
        expect($scope.uiState.get('spy.mode.name', null)).to.be.null;
        openSpy();
        expect($scope.uiState.get('spy.mode.name', null)).to.equal('spymode1');
      });

      it('should sync uiState when closing the panel', () => {
        openSpy();
        expect($scope.uiState.get('spy.mode.name', null)).to.equal('spymode1');
        $el.toggleButton.click();
        expect($scope.uiState.get('spy.mode.name', null)).to.equal(null);
      });

      it('should sync uiState when maximizing', () => {
        openSpy();
        expect($scope.uiState.get('spy.mode.fill', null)).to.equal(null);
        $el.maximizedButton.click(); // Maximize it initially
        expect($scope.uiState.get('spy.mode.fill', false)).to.equal(true);
        $el.maximizedButton.click(); // Reset maximized state again
        expect($scope.uiState.get('spy.mode.fill', false)).to.equal(false);
      });

      it('should also reset fullscreen when closing panel', () => {
        openSpy();
        $el.maximizedButton.click();
        expect($scope.uiState.get('spy.mode.fill', false)).to.equal(true);
        $el.toggleButton.click(); // Close spy panel
        expect($scope.uiState.get('spy.mode.fill', null)).to.equal(null);
      });
    });


  });

});
