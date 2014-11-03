define(function (require) {
  describe('AggTable Directive', function () {
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
      tabifyAggResponse = Private(require('components/agg_response/tabify/tabify_agg_response'));
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


    it('renders a simple response properly', function () {
      var vis = new Vis(indexPattern, 'table');
      $scope.table = tabifyAggResponse(vis, fixtures.metricOnly, { canSplit: false });
      var $el = $('<kbn-agg-table table="table"></kbn-agg-table>');

      $compile($el)($scope);
      $scope.$digest();

      expect($el.find('tbody').size()).to.be(1);
      expect($el.find('td').size()).to.be(1);
      expect($el.find('td').text()).to.eql(1000);
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

      $scope.table = tabifyAggResponse(vis, fixtures.threeTermBuckets, { canSplit: false });
      var $el = $('<kbn-agg-table table="table"></kbn-agg-table>').appendTo(document.body);
      $compile($el)($scope);
      $scope.$digest();

      expect($el.find('tbody').size()).to.be(1);

      var $rows = $el.find('tbody tr');
      expect($rows.size()).to.be.greaterThan(0);

      $rows.each(function (i) {
        // 4 cells in every row
        var $cells = $(this).find('td');

        expect($cells.size()).to.be(6);

        var txts = $cells.map(function () {
          return $(this).text().trim();
        });

        // two character country code
        expect(txts[0]).to.match(/^(png|jpg|gif|html|css)$/);

        // average bytes
        expect(txts[1]).to.match(/^\d+$/);
        var bytesAsNum = _.parseInt(txts[1]);
        expect(bytesAsNum === 0 || bytesAsNum > 1000).to.be.ok();

        // os
        expect(txts[2]).to.match(/^(win|mac|linux)$/);

        // average bytes
        expect(txts[1]).to.match(/^\d+$/);
        bytesAsNum = _.parseInt(txts[1]);
        expect(bytesAsNum === 0 || bytesAsNum > 1000).to.be.ok();
      });
    });
  });
});