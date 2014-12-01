define(function (require) {
  return ['AggTable Directive', function () {
    var _ = require('lodash');
    var $ = require('jquery');
    var fixtures = require('fixtures/fake_hierarchical_data');
    var sinon = require('test_utils/auto_release_sinon');

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


    it('renders a simple response properly', function () {
      var vis = new Vis(indexPattern, 'table');
      $scope.table = tabifyAggResponse(vis, fixtures.metricOnly, { canSplit: false });

      var $el = $compile('<kbn-agg-table table="table"></kbn-agg-table>')($scope);
      $scope.$digest();

      expect($el.find('tbody').size()).to.be(1);
      expect($el.find('td').size()).to.be(1);
      expect($el.find('td').text()).to.eql(1000);
    });

    it('renders nothing if the table is empty', function () {
      $scope.table = null;
      var $el = $compile('<kbn-agg-table table="table"></kbn-agg-table>')($scope);
      $scope.$digest();

      expect($el.find('tbody').size()).to.be(0);
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
      var $el = $('<kbn-agg-table table="table"></kbn-agg-table>');
      $compile($el)($scope);
      $scope.$digest();

      expect($el.find('tbody').size()).to.be(1);

      var $rows = $el.find('tbody tr');
      expect($rows.size()).to.be.greaterThan(0);

      function validBytes(str) {
        expect(str).to.match(/^\d+$/);
        var bytesAsNum = _.parseInt(str);
        expect(bytesAsNum === 0 || bytesAsNum > 1000).to.be.ok();
      }

      $rows.each(function (i) {
        // 6 cells in every row
        var $cells = $(this).find('td');
        expect($cells.size()).to.be(6);

        var txts = $cells.map(function () {
          return $(this).text().trim();
        });

        // two character country code
        expect(txts[0]).to.match(/^(png|jpg|gif|html|css)$/);
        validBytes(txts[1]);

        // country
        expect(txts[2]).to.match(/^\w\w$/);
        validBytes(txts[3]);

        // os
        expect(txts[4]).to.match(/^(win|mac|linux)$/);
        validBytes(txts[5]);
      });
    });

    describe('aggTable.toCsv()', function () {
      it('escapes and formats the rows and columns properly', function () {
        var $el = $compile('<kbn-agg-table table="table">')($scope);
        $scope.$digest();

        var $tableScope = $el.isolateScope();
        var aggTable = $tableScope.aggTable;

        $tableScope.table = {
          columns: [
            { title: 'one' },
            { title: 'two' },
            { title: 'with double-quotes(")' }
          ],
          rows: [
            [1, 2, '"foobar"']
          ]
        };

        expect(aggTable.toCsv()).to.be(
          'one,two,"with double-quotes("")"' + '\r\n' +
          '1,2,"""foobar"""' + '\r\n'
        );
      });
    });

    describe('aggTable.exportAsCsv()', function () {
      var origBlob;
      function FakeBlob(slices, opts) {
        this.slices = slices;
        this.opts = opts;
      }

      beforeEach(function () {
        origBlob = window.Blob;
        window.Blob = FakeBlob;
      });

      afterEach(function () {
        window.Blob = origBlob;
      });

      it('calls _saveAs properly', function () {
        var $el = $compile('<kbn-agg-table table="table">')($scope);
        $scope.$digest();

        var $tableScope = $el.isolateScope();
        var aggTable = $tableScope.aggTable;

        var saveAs = sinon.stub(aggTable, '_saveAs');
        $tableScope.table = {
          columns: [
            { title: 'one' },
            { title: 'two' },
            { title: 'with double-quotes(")' }
          ],
          rows: [
            [1, 2, '"foobar"']
          ]
        };

        aggTable.csv.filename = 'somefilename.csv';
        aggTable.exportAsCsv();

        expect(saveAs.callCount).to.be(1);
        var call = saveAs.getCall(0);
        expect(call.args[0]).to.be.a(FakeBlob);
        expect(call.args[0].slices).to.eql([
          'one,two,"with double-quotes("")"' + '\r\n' +
          '1,2,"""foobar"""' + '\r\n'
        ]);
        expect(call.args[0].opts).to.eql({
          type: 'text/plain'
        });
        expect(call.args[1]).to.be('somefilename.csv');
      });
    });
  }];
});