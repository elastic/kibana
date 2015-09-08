
require('ui/paginated_table');
var _ = require('lodash');
var $ = require('jquery');
var sinon = require('sinon');
var expect = require('expect.js');
var ngMock = require('ngMock');

describe('paginated table', function () {
  var $el;
  var $rootScope;
  var $compile;
  var $scope;
  var $elScope;
  var $orderBy;
  var defaultPerPage = 10;

  var makeData = function (colCount, rowCount) {
    var columns = [];
    var rows = [];

    if (_.isNumber(colCount)) {
      _.times(colCount, function (i) {
        columns.push({ title: 'column' + i });
      });
    } else {
      columns = colCount;
    }

    if (_.isNumber(rowCount)) {
      _.times(rowCount, function (col) {
        var rowItems = [];

        _.times(columns.length, function (row) {
          rowItems.push('item' + col + row);
        });

        rows.push(rowItems);
      });
    } else {
      rows = rowCount;
    }

    return {
      columns: columns,
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

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, _$compile_, $filter) {
    $rootScope = _$rootScope_;
    $compile = _$compile_;
    $orderBy = $filter('orderBy');
    $scope = $rootScope.$new();
  }));

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
      data = makeData(3, [
        ['bbbb', 'aaaa', 'zzzz'],
        ['cccc', 'cccc', 'aaaa'],
        ['zzzz', 'bbbb', 'bbbb'],
        ['aaaa', 'zzzz', 'cccc'],
      ]);

      lastRowIndex = data.rows.length - 1;
      renderTable(data.columns, data.rows);
      paginatedTable = $el.isolateScope().paginatedTable;
    });

    // afterEach(function () {
    //   $scope.$destroy();
    // });

    it('should not sort by default', function () {
      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be(data.rows[0][0]);
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be(data.rows[lastRowIndex][0]);
    });

    it('should do nothing when sorting by invalid column id', function () {
      // sortColumn
      paginatedTable.sortColumn(999);
      $scope.$digest();

      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('bbbb');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
      expect(tableRows.eq(0).find('td').eq(2).text()).to.be('zzzz');
    });

    it('should do nothing when sorting by non sortable column', function () {
      data.columns[0].sortable = false;

      // sortColumn
      paginatedTable.sortColumn(0);
      $scope.$digest();

      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('bbbb');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
      expect(tableRows.eq(0).find('td').eq(2).text()).to.be('zzzz');
    });

    it('should sort ascending on first invocation', function () {
      // sortColumn
      paginatedTable.sortColumn(0);
      $scope.$digest();

      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('aaaa');
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('zzzz');
    });

    it('should sort descending on second invocation', function () {
      // sortColumn
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      $scope.$digest();

      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('zzzz');
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('aaaa');
    });

    it('should clear sorting on third invocation', function () {
      // sortColumn
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      $scope.$digest();

      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be(data.rows[0][0]);
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('aaaa');
    });

    it('should sort new column ascending', function () {
      // sort by first column
      paginatedTable.sortColumn(0);
      $scope.$digest();

      // sort by second column
      paginatedTable.sortColumn(1);
      $scope.$digest();

      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
      expect(tableRows.eq(lastRowIndex).find('td').eq(1).text()).to.be('zzzz');
    });

  });

  describe('sorting duplicate columns', function () {
    var data;
    var paginatedTable;
    var colText = 'test row';

    beforeEach(function () {
      var cols = [
        { title: colText },
        { title: colText },
        { title: colText }
      ];
      var rows = [
        ['bbbb', 'aaaa', 'zzzz'],
        ['cccc', 'cccc', 'aaaa'],
        ['zzzz', 'bbbb', 'bbbb'],
        ['aaaa', 'zzzz', 'cccc'],
      ];
      data = makeData(cols, rows);

      renderTable(data.columns, data.rows);
      paginatedTable = $el.isolateScope().paginatedTable;
    });

    it('should have duplicate column titles', function () {
      var columns = $el.find('thead th span');
      columns.each(function () {
        expect($(this).text()).to.be(colText);
      });
    });

    it('should handle sorting on columns with the same name', function () {
      // sort by the last column
      paginatedTable.sortColumn(2);
      $scope.$digest();

      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('cccc');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('cccc');
      expect(tableRows.eq(0).find('td').eq(2).text()).to.be('aaaa');
      expect(tableRows.eq(1).find('td').eq(2).text()).to.be('bbbb');
      expect(tableRows.eq(2).find('td').eq(2).text()).to.be('cccc');
      expect(tableRows.eq(3).find('td').eq(2).text()).to.be('zzzz');
    });

    it('should sort correctly between columns', function () {
      // sort by the last column
      paginatedTable.sortColumn(2);
      $scope.$digest();

      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('cccc');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('cccc');
      expect(tableRows.eq(0).find('td').eq(2).text()).to.be('aaaa');

      // sort by the first column
      paginatedTable.sortColumn(0);
      $scope.$digest();

      tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('aaaa');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('zzzz');
      expect(tableRows.eq(0).find('td').eq(2).text()).to.be('cccc');

      expect(tableRows.eq(1).find('td').eq(0).text()).to.be('bbbb');
      expect(tableRows.eq(2).find('td').eq(0).text()).to.be('cccc');
      expect(tableRows.eq(3).find('td').eq(0).text()).to.be('zzzz');
    });

    it('should not sort duplicate columns', function () {
      paginatedTable.sortColumn(1);
      $scope.$digest();

      var sorters = $el.find('thead th i');
      expect(sorters.eq(0).hasClass('fa-sort')).to.be(true);
      expect(sorters.eq(1).hasClass('fa-sort')).to.be(false);
      expect(sorters.eq(2).hasClass('fa-sort')).to.be(true);
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
      paginatedTable.sortColumn(columnIndex);
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
      paginatedTable.sortColumn(0);
      $scope.$digest();
      var tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('h1').size()).to.be(0);
      expect(tableRows.eq(1).find('h1').size()).to.be(0);
      // html row should be the last row
      expect(tableRows.eq(2).find('h1').size()).to.be(1);

      paginatedTable.sortColumn(0);
      $scope.$digest();
      tableRows = $el.find('tbody tr');
      // html row should be the first row
      expect(tableRows.eq(0).find('h1').size()).to.be(1);
      expect(tableRows.eq(1).find('h1').size()).to.be(0);
      expect(tableRows.eq(2).find('h1').size()).to.be(0);
    });
  });
});
