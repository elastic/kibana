
import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/paginated_table';
import $ from 'jquery';

describe('paginated table', function () {
  let $el;
  let $rootScope;
  let $compile;
  let $scope;
  let $elScope;
  let $orderBy;
  let defaultPerPage = 10;

  let makeData = function (colCount, rowCount) {
    let columns = [];
    let rows = [];

    if (_.isNumber(colCount)) {
      _.times(colCount, function (i) {
        columns.push({ title: 'column' + i });
      });
    } else {
      columns = colCount;
    }

    if (_.isNumber(rowCount)) {
      _.times(rowCount, function (col) {
        let rowItems = [];

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

  let renderTable = function (cols, rows, perPage) {
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
      let cols = [{
        title: 'test1'
      }];
      let rows = [];

      renderTable(cols, rows);
      expect($el.children().size()).to.be(0);
    });

    it('should render columns and rows', function () {
      let data = makeData(2, 2);
      let cols = data.columns;
      let rows = data.rows;

      renderTable(cols, rows);
      expect($el.children().size()).to.be(1);
      let tableRows = $el.find('tbody tr');
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
      let rowCount = _.random(16, 24);
      let perPageCount = _.random(5, 8);
      let data = makeData(3, rowCount);
      let pageCount = Math.ceil(rowCount / perPageCount);

      renderTable(data.columns, data.rows, perPageCount);
      let tableRows = $el.find('tbody tr');
      expect(tableRows.size()).to.be(perPageCount);
      // add 2 for the first and last page links
      expect($el.find('paginate-controls a').size()).to.be(pageCount + 2);
    });
  });

  describe('sorting', function () {
    let data;
    let lastRowIndex;
    let paginatedTable;

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
      let tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be(data.rows[0][0]);
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be(data.rows[lastRowIndex][0]);
    });

    it('should do nothing when sorting by invalid column id', function () {
      // sortColumn
      paginatedTable.sortColumn(999);
      $scope.$digest();

      let tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('bbbb');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
      expect(tableRows.eq(0).find('td').eq(2).text()).to.be('zzzz');
    });

    it('should do nothing when sorting by non sortable column', function () {
      data.columns[0].sortable = false;

      // sortColumn
      paginatedTable.sortColumn(0);
      $scope.$digest();

      let tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('bbbb');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
      expect(tableRows.eq(0).find('td').eq(2).text()).to.be('zzzz');
    });

    it('should sort ascending on first invocation', function () {
      // sortColumn
      paginatedTable.sortColumn(0);
      $scope.$digest();

      let tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('aaaa');
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('zzzz');
    });

    it('should sort descending on second invocation', function () {
      // sortColumn
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      $scope.$digest();

      let tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('zzzz');
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('aaaa');
    });

    it('should clear sorting on third invocation', function () {
      // sortColumn
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      $scope.$digest();

      let tableRows = $el.find('tbody tr');
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

      let tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
      expect(tableRows.eq(lastRowIndex).find('td').eq(1).text()).to.be('zzzz');
    });

  });

  describe('sorting duplicate columns', function () {
    let data;
    let paginatedTable;
    let colText = 'test row';

    beforeEach(function () {
      let cols = [
        { title: colText },
        { title: colText },
        { title: colText }
      ];
      let rows = [
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
      let columns = $el.find('thead th span');
      columns.each(function () {
        expect($(this).text()).to.be(colText);
      });
    });

    it('should handle sorting on columns with the same name', function () {
      // sort by the last column
      paginatedTable.sortColumn(2);
      $scope.$digest();

      let tableRows = $el.find('tbody tr');
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

      let tableRows = $el.find('tbody tr');
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

      let sorters = $el.find('thead th i');
      expect(sorters.eq(0).hasClass('fa-sort')).to.be(true);
      expect(sorters.eq(1).hasClass('fa-sort')).to.be(false);
      expect(sorters.eq(2).hasClass('fa-sort')).to.be(true);
    });

  });

  describe('custom sorting', function () {
    let data;
    let paginatedTable;
    let sortHandler;

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
      let columnIndex = 1;
      paginatedTable.sortColumn(columnIndex);
      $scope.$digest();
      expect(sortHandler.callCount).to.be(1);
      expect(sortHandler.getCall(0).args[0]).to.be(columnIndex);
    });
  });

  describe('object rows', function () {
    let cols;
    let rows;
    let paginatedTable;

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
      let tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('h1').size()).to.be(0);
      expect(tableRows.eq(1).find('h1').size()).to.be(1);
      expect(tableRows.eq(2).find('h1').size()).to.be(0);
    });

    it('should sort using object value', function () {
      paginatedTable.sortColumn(0);
      $scope.$digest();
      let tableRows = $el.find('tbody tr');
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
