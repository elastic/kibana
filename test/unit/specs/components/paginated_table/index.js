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
      it('should not display without rows');
      it('should render columns and rows');
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