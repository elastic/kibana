define(function (require) {
  require('components/paginated_table/paginated_table');
  var _ = require('lodash');
  var faker = require('faker');
  var sinon = require('sinon/sinon');

  describe('paginated table', function () {
    var $el;
    var $rootScope;
    var $compile;
    var $scope;
    var $elScope;
    var $orderBy;
    var defaultPerPage = 10;

    var makeData = function (colCount, rowCount) {
      // faker.Lorem.words can generate the same word multiple times
      // so, generate 3x the request number, use uniq, and trim down to the requested total
      var cols = _.uniq(faker.Lorem.words(colCount * 3)).slice(0, colCount).map(function (word) {
        return { title: word };
      });

      var rows = [];
      _.times(rowCount, function () {
        rows.push(faker.Lorem.words(colCount));
      });

      return {
        columns: cols,
        rows: rows
      };
    };

    var renderTable = function (cols, rows, perPage) {
      $scope.cols = cols || [];
      $scope.rows = rows || [];
      $scope.perPage = perPage || defaultPerPage;

      $el = $compile('<paginated-table columns="cols" rows="rows" per-page="perPage">')($scope);

      $scope.$digest();
    };

    beforeEach(function () {
      module('kibana');

      inject(function (_$rootScope_, _$compile_, $filter) {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $orderBy = $filter('orderBy');
      });

      $scope = $rootScope.$new();
    });

    afterEach(function () {
      $scope.$destroy();
    });

    describe('rendering', function () {
      it('should not display without rows', function () {
        var cols = [{
          title: 'test1'
        }];
        var rows = [];

        renderTable(cols, rows);
        expect($el.children().size()).to.be(0);
      });

      it('should render columns and rows', function () {
        var data = makeData(2, 2);
        var cols = data.columns;
        var rows = data.rows;

        renderTable(cols, rows);
        expect($el.children().size()).to.be(1);
        var tableRows = $el.find('tbody tr');
        // should pad rows
        expect(tableRows.size()).to.be(defaultPerPage);
        // should contain the row data
        expect(tableRows.eq(0).find('td').eq(0).text()).to.be(rows[0][0]);
        expect(tableRows.eq(0).find('td').eq(1).text()).to.be(rows[0][1]);
        expect(tableRows.eq(1).find('td').eq(0).text()).to.be(rows[1][0]);
        expect(tableRows.eq(1).find('td').eq(1).text()).to.be(rows[1][1]);
      });

      it('should paginate rows', function () {
        // note: paginate truncates pages, so don't make too many
        var rowCount = _.random(16, 24);
        var perPageCount = _.random(5, 8);
        var data = makeData(3, rowCount);
        var pageCount = Math.ceil(rowCount / perPageCount);

        renderTable(data.columns, data.rows, perPageCount);
        var tableRows = $el.find('tbody tr');
        expect(tableRows.size()).to.be(perPageCount);
        // add 2 for the first and last page links
        expect($el.find('paginate-controls a').size()).to.be(pageCount + 2);
      });
    });

    describe('sorting', function () {
      var data;
      var lastRowIndex;
      var paginatedTable;

      beforeEach(function () {
        data = makeData(3, 0);
        data.rows.push(['bbbb', 'aaaa', 'zzzz']);
        data.rows.push(['cccc', 'cccc', 'aaaa']);
        data.rows.push(['zzzz', 'bbbb', 'bbbb']);
        data.rows.push(['aaaa', 'zzzz', 'cccc']);

        lastRowIndex = data.rows.length - 1;
        renderTable(data.columns, data.rows);
        paginatedTable = $el.isolateScope().paginatedTable;
      });

      afterEach(function () {
        $scope.$destroy();
      });

      it('should not sort by default', function () {
        var tableRows = $el.find('tbody tr');
        expect(tableRows.eq(0).find('td').eq(0).text()).to.be(data.rows[0][0]);
        expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be(data.rows[lastRowIndex][0]);
      });

      it('should sort ascending on first invocation', function () {
        // sortColumn
        paginatedTable.sortColumn(data.columns[0]);
        $scope.$digest();

        var tableRows = $el.find('tbody tr');
        expect(tableRows.eq(0).find('td').eq(0).text()).to.be('aaaa');
        expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('zzzz');
      });

      it('should sort descending on second invocation', function () {
        // sortColumn
        paginatedTable.sortColumn(data.columns[0]);
        paginatedTable.sortColumn(data.columns[0]);
        $scope.$digest();

        var tableRows = $el.find('tbody tr');
        expect(tableRows.eq(0).find('td').eq(0).text()).to.be('zzzz');
        expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('aaaa');
      });

      it('should clear sorting on third invocation', function () {
        // sortColumn
        paginatedTable.sortColumn(data.columns[0]);
        paginatedTable.sortColumn(data.columns[0]);
        paginatedTable.sortColumn(data.columns[0]);
        $scope.$digest();

        var tableRows = $el.find('tbody tr');
        expect(tableRows.eq(0).find('td').eq(0).text()).to.be(data.rows[0][0]);
        expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('aaaa');
      });

      it('should sort new column ascending', function () {
        // sort by first column
        paginatedTable.sortColumn(data.columns[0]);
        $scope.$digest();
        // sort by second column
        paginatedTable.sortColumn(data.columns[1]);
        $scope.$digest();

        var tableRows = $el.find('tbody tr');
        expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
        expect(tableRows.eq(lastRowIndex).find('td').eq(1).text()).to.be('zzzz');
      });
    });

    describe('custom sorting', function () {
      var data;
      var paginatedTable;
      var sortHandler;

      beforeEach(function () {
        sortHandler = sinon.spy();
        data = makeData(3, 3);
        $scope.cols = data.columns;
        $scope.rows = data.rows;
        $scope.perPage = defaultPerPage;
        $scope.sortHandler = sortHandler;

        $el = $compile('<paginated-table columns="cols" rows="rows" per-page="perPage"' +
          'sort-handler="sortHandler">')($scope);

        $scope.$digest();
        paginatedTable = $el.isolateScope().paginatedTable;
      });

      // TODO: This is failing randomly
      it('should allow custom sorting handler', function () {
        var columnIndex = 1;
        paginatedTable.sortColumn(data.columns[columnIndex]);
        $scope.$digest();
        expect(sortHandler.callCount).to.be(1);
        expect(sortHandler.getCall(0).args[0]).to.be(columnIndex);
      });
    });

    describe('object rows', function () {
      var cols;
      var rows;
      var paginatedTable;

      beforeEach(function () {
        cols = [{
          title: 'object test'
        }];
        rows = [
          ['aaaa'],
          [{
            markup: '<h1>I am HTML in a row</h1>',
            value: 'zzzz'
          }],
          ['bbbb']
        ];
        renderTable(cols, rows);
        paginatedTable = $el.isolateScope().paginatedTable;
      });

      it('should append object markup', function () {
        var tableRows = $el.find('tbody tr');
        expect(tableRows.eq(0).find('h1').size()).to.be(0);
        expect(tableRows.eq(1).find('h1').size()).to.be(1);
        expect(tableRows.eq(2).find('h1').size()).to.be(0);
      });

      it('should sort using object value', function () {
        paginatedTable.sortColumn(cols[0]);
        $scope.$digest();
        var tableRows = $el.find('tbody tr');
        expect(tableRows.eq(0).find('h1').size()).to.be(0);
        expect(tableRows.eq(1).find('h1').size()).to.be(0);
        // html row should be the last row
        expect(tableRows.eq(2).find('h1').size()).to.be(1);

        paginatedTable.sortColumn(cols[0]);
        $scope.$digest();
        tableRows = $el.find('tbody tr');
        // html row should be the first row
        expect(tableRows.eq(0).find('h1').size()).to.be(1);
        expect(tableRows.eq(1).find('h1').size()).to.be(0);
        expect(tableRows.eq(2).find('h1').size()).to.be(0);
      });
    });
  });
});
