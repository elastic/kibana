define(function (require) {
  return ['AggTable Directive', function () {
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

    describe('aggTable.cycleSort()', function () {
      var vis;
      beforeEach(function () {
        vis = new Vis(indexPattern, {
          type: 'table',
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

        vis.aggs.forEach(function (agg, i) {
          agg.id = 'agg_' + (i + 1);
        });
      });

      function checkAgainst(aggTable, $el, selector) {
        return function (asc, firstCol) {
          switch (asc) {
          case null:
            expect(aggTable.sort == null).to.be(true);
            break;
          case true:
          case false:
            expect(aggTable.sort).to.have.property('asc', asc);
            break;
          }

          var $leftCol = $el.find(selector || 'tr td:first-child');
          firstCol.forEach(function (val, i) {
            expect($leftCol.eq(i).text().trim()).to.be(val);
          });
        };
      }

      it('sorts by the column passed in', function () {
        $scope.table = tabifyAggResponse(vis, fixtures.oneRangeBucket, { canSplit: false });
        var $el = $compile('<kbn-agg-table table="table">')($scope);
        $scope.$digest();

        var sortCol = $scope.table.columns[0];
        var $tableScope = $el.isolateScope();
        var aggTable = $tableScope.aggTable;
        var check = checkAgainst(aggTable, $el);

        // default state
        check(null, [
          '0.0-1000.0',
          '1000.0-2000.0'
        ]);

        // enable accending
        aggTable.cycleSort(sortCol);
        $scope.$digest();
        check(true, [
          '0.0-1000.0',
          '1000.0-2000.0'
        ]);

        // enable descending
        aggTable.cycleSort(sortCol);
        $scope.$digest();
        check(false, [
          '1000.0-2000.0',
          '0.0-1000.0'
        ]);

        // disable sort
        aggTable.cycleSort(sortCol);
        $scope.$digest();
        check(null, [
          '0.0-1000.0',
          '1000.0-2000.0'
        ]);
      });

      it('sorts new tables by the previous sort rule', function () {
        $scope.table = tabifyAggResponse(vis, fixtures.oneRangeBucket, { canSplit: false });
        var $el = $compile('<kbn-agg-table table="table">')($scope);
        $scope.$digest();

        var sortCol = $scope.table.columns[0];
        var $tableScope = $el.isolateScope();
        var aggTable = $tableScope.aggTable;
        var check = checkAgainst(aggTable, $el);

        // enable accending, then descending
        aggTable.cycleSort(sortCol);
        aggTable.cycleSort(sortCol);
        $scope.$digest();
        check(false, [
          '1000.0-2000.0',
          '0.0-1000.0'
        ]);

        var prevFormattedRows = $tableScope.formattedRows;

        // change the table and trigger the watchers
        $scope.table = tabifyAggResponse(vis, fixtures.oneRangeBucket, { canSplit: false });
        $scope.$digest();

        // prove that the rows were recreated
        expect($tableScope.formattedRows).to.not.be(prevFormattedRows);

        // check that the order is right
        check(false, [
          '1000.0-2000.0',
          '0.0-1000.0'
        ]);
      });

      it('sorts ascending when switching from another column', function () {
        $scope.table = tabifyAggResponse(vis, fixtures.oneRangeBucket, { canSplit: false });
        var $el = $compile('<kbn-agg-table table="table">')($scope);
        $scope.$digest();

        var $tableScope = $el.isolateScope();
        var aggTable = $tableScope.aggTable;

        var rangeCol = $scope.table.columns[0];
        var countCol = $scope.table.columns[1];
        var checkRange = checkAgainst(aggTable, $el, 'tr td:first-child');
        var checkCount = checkAgainst(aggTable, $el, 'tr td:last-child');

        // sort count accending
        aggTable.cycleSort(countCol);
        $scope.$digest();
        checkCount(true, [
          '298',
          '606'
        ]);

        // switch to sorting range ascending
        aggTable.cycleSort(rangeCol);
        $scope.$digest();
        checkRange(true, [
          '0.0-1000.0',
          '1000.0-2000.0'
        ]);
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
  }];
});