
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/paginated_table';
import $ from 'jquery';

describe('paginated table', function () {
  let $el;
  let $rootScope;
  let $compile;
  let $scope;
  const defaultPerPage = 10;

  const makeData = function (colCount, rowCount) {
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
        const rowItems = [];

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

  const renderTable = function (cols, rows, perPage, sort, showBlankRows, linkToTop) {
    $scope.cols = cols || [];
    $scope.rows = rows || [];
    $scope.perPage = perPage || defaultPerPage;
    $scope.sort = sort || {};
    $scope.showBlankRows = showBlankRows;
    $scope.linkToTop = linkToTop;

    const template = `
      <paginated-table
        columns="cols"
        rows="rows"
        per-page="perPage"
        sort="sort"
        link-to-top="linkToTop"
        show-blank-rows="showBlankRows">`;
    $el = $compile(template)($scope);

    $scope.$digest();
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, _$compile_) {
    $rootScope = _$rootScope_;
    $compile = _$compile_;
    $scope = $rootScope.$new();
  }));

  describe('rendering', function () {
    it('should not display without rows', function () {
      const cols = [{
        title: 'test1'
      }];
      const rows = [];

      renderTable(cols, rows);
      expect($el.children().size()).to.be(0);
    });

    it('should render columns and rows', function () {
      const data = makeData(2, 2);
      const cols = data.columns;
      const rows = data.rows;

      renderTable(cols, rows);
      expect($el.children().size()).to.be(1);
      const tableRows = $el.find('tbody tr');
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
      const rowCount = _.random(16, 24);
      const perPageCount = _.random(5, 8);
      const data = makeData(3, rowCount);
      const pageCount = Math.ceil(rowCount / perPageCount);

      renderTable(data.columns, data.rows, perPageCount);
      const tableRows = $el.find('tbody tr');
      expect(tableRows.size()).to.be(perPageCount);
      // add 2 for the first and last page links
      expect($el.find('paginate-controls a').size()).to.be(pageCount + 2);
    });

    it('should not show blank rows on last page when so specified', function () {
      const rowCount = 7;
      const perPageCount = 10;
      const data = makeData(3, rowCount);

      renderTable(data.columns, data.rows, perPageCount, null, false);
      const tableRows = $el.find('tbody tr');
      expect(tableRows.size()).to.be(rowCount);
    });

    it('should not show link to top when not set', function () {
      const data = makeData(5, 5);
      renderTable(data.columns, data.rows, 10, null, false);

      const linkToTop = $el.find('[data-test-subj="paginateControlsLinkToTop"]');
      expect(linkToTop.size()).to.be(0);
    });

    it('should show link to top when set', function () {
      const data = makeData(5, 5);
      renderTable(data.columns, data.rows, 10, null, false, true);

      const linkToTop = $el.find('[data-test-subj="paginateControlsLinkToTop"]');
      expect(linkToTop.size()).to.be(1);
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
      const tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be(data.rows[0][0]);
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be(data.rows[lastRowIndex][0]);
    });

    it('should do nothing when sorting by invalid column id', function () {
      // sortColumn
      paginatedTable.sortColumn(999);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('bbbb');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
      expect(tableRows.eq(0).find('td').eq(2).text()).to.be('zzzz');
    });

    it('should do nothing when sorting by non sortable column', function () {
      data.columns[0].sortable = false;

      // sortColumn
      paginatedTable.sortColumn(0);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('bbbb');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
      expect(tableRows.eq(0).find('td').eq(2).text()).to.be('zzzz');
    });

    it('should set the sort direction to asc when it\'s not explicity set', function () {
      paginatedTable.sortColumn(1);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(tableRows.eq(2).find('td').eq(1).text()).to.be('cccc');
      expect(tableRows.eq(1).find('td').eq(1).text()).to.be('bbbb');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
    });

    it('should allow you to explicitly set the sort direction', function () {
      paginatedTable.sortColumn(1, 'desc');
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('zzzz');
      expect(tableRows.eq(1).find('td').eq(1).text()).to.be('cccc');
      expect(tableRows.eq(2).find('td').eq(1).text()).to.be('bbbb');
    });

    it('should sort ascending on first invocation', function () {
      // sortColumn
      paginatedTable.sortColumn(0);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('aaaa');
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('zzzz');
    });

    it('should sort descending on second invocation', function () {
      // sortColumn
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(0).text()).to.be('zzzz');
      expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be('aaaa');
    });

    it('should clear sorting on third invocation', function () {
      // sortColumn
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
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

      const tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('td').eq(1).text()).to.be('aaaa');
      expect(tableRows.eq(lastRowIndex).find('td').eq(1).text()).to.be('zzzz');
    });

  });

  describe('sorting duplicate columns', function () {
    let data;
    let paginatedTable;
    const colText = 'test row';

    beforeEach(function () {
      const cols = [
        { title: colText },
        { title: colText },
        { title: colText }
      ];
      const rows = [
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
      const columns = $el.find('thead th span');
      columns.each(function () {
        expect($(this).text()).to.be(colText);
      });
    });

    it('should handle sorting on columns with the same name', function () {
      // sort by the last column
      paginatedTable.sortColumn(2);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
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

      const sorters = $el.find('thead th i');
      expect(sorters.eq(0).hasClass('fa-sort')).to.be(true);
      expect(sorters.eq(1).hasClass('fa-sort')).to.be(false);
      expect(sorters.eq(2).hasClass('fa-sort')).to.be(true);
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
      const tableRows = $el.find('tbody tr');
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
