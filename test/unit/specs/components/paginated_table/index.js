define(function (require) {
  require('components/paginated_table/paginated_table');

  describe.only('paginated table', function () {
    var $el;
    var $rootScope;
    var $compile;
    var $scope;
    var $elScope;
    var defaultPerPage = 10;

    var init = function () {
      // load the application
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

      inject(function (_$rootScope_, _$compile_) {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
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
        var cols = [{
          title: 'col1'
        }, {
          title: 'col2'
        }];
        var rows = [
          ['bacon', 'pork chop'],
          ['steak', 'tri-tip'],
        ];

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

      it('should paginate rows');
      it('should allow custom pagination code');
    });

    describe('sorting', function () {
      it('should not sort by default');
      it('should sort ascending on first click');
      it('should sort desciending on second click');
      it('should clear sorting on third click');
      it('should sort using $orderBy');
      it('should allow custom sorting handler');
    });
  });
});