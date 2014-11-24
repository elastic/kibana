define(function (require) {
  require('components/paginated_table/paginated_table');
  var _ = require('lodash');
  var faker = require('faker');

  describe.only('paginated table', function () {
    var $el;
    var $rootScope;
    var $compile;
    var $scope;
    var $elScope;
    var $orderBy;
    var defaultPerPage = 10;

    var init = function () {
      // load the application
    };

    var makeData = function (colCount, rowCount) {
      var cols = faker.Lorem.words(colCount).map(function (word) {
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

      $elScope = $el.scope();
      $elScope.$digest();
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
      var data = makeData(3, 3);

      beforeEach(function () {
        data.rows.push(['zzzz', 'zzzz', 'zzzz']);
        data.rows.push(['aaaa', 'aaaa', 'aaaa']);
      });

      it('should not sort by default', function () {
        var lastRowIndex = data.rows.length - 1;
        renderTable(data.columns, data.rows);
        var tableRows = $el.find('tbody tr');
        expect(tableRows.eq(lastRowIndex).find('td').eq(0).text()).to.be(data.rows[lastRowIndex][0]);
      });

      it('should sort ascending on first click');
      it('should sort desciending on second click');
      it('should clear sorting on third click');
      it('should sort using $orderBy');
      it('should allow custom sorting handler');
    });
  });
});