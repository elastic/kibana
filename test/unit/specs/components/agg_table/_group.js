define(function (require) {
  return ['AggTableGroup Directive', function () {
    var _ = require('lodash');
    var $ = require('jquery');
    var fixtures = require('fixtures/fake_hierarchical_data');

    var $rootScope;
    var $compile;
    var tabifyAggResponse;
    var Vis;
    var indexPattern;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector, Private) {
      tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      Vis = Private(require('components/vis/vis'));

      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');
    }));

    var $scope;
    beforeEach(function () {
      $scope = $rootScope.$new();
    });
    afterEach(function () {
      $scope.$destroy();
    });


    it('renders a simple split response properly', function () {
      var vis = new Vis(indexPattern, 'table');
      $scope.group = tabifyAggResponse(vis, fixtures.metricOnly);
      var $el = $('<kbn-agg-table-group group="group"></kbn-agg-table-group>');

      $compile($el)($scope);
      $scope.$digest();

      // should create one sub-tbale
      expect($el.find('kbn-agg-table').size()).to.be(1);
    });

    it('renders nothing if the table list is empty', function () {
      var $el = $('<kbn-agg-table-group group="group"></kbn-agg-table-group>');

      $scope.group = {
        tables: []
      };

      $compile($el)($scope);
      $scope.$digest();

      var $subTables = $el.find('kbn-agg-table');
      expect($subTables.size()).to.be(0);
    });

    it('renders a complex response properly', function () {
      var vis = new Vis(indexPattern, {
        type: 'pie',
        aggs: [
          { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
          { type: 'terms', schema: 'split', params: { field: 'extension' } },
          { type: 'terms', schema: 'segment', params: { field: 'geo.src' } },
          { type: 'terms', schema: 'segment', params: { field: 'machine.os' } }
        ]
      });
      vis.aggs.forEach(function (agg, i) {
        agg.id = 'agg_' + (i + 1);
      });

      var group = $scope.group = tabifyAggResponse(vis, fixtures.threeTermBuckets);
      var $el = $('<kbn-agg-table-group group="group"></kbn-agg-table-group>');
      $compile($el)($scope);
      $scope.$digest();

      var $subTables = $el.find('kbn-agg-table');
      expect($subTables.size()).to.be(3);

      var $subTableHeaders = $el.find('.agg-table-group-header');
      expect($subTableHeaders.size()).to.be(3);

      $subTableHeaders.each(function (i) {
        expect($(this).text()).to.be(group.tables[i].title);
      });
    });
  }];
});