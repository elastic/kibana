define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');
  var searchResponse = require('fixtures/search_response');

  // Load the kibana app dependencies.
  require('services/private');
  require('components/doc_table/doc_table');


  var $parentScope, $scope, $timeout, searchSource;

  var init = function ($elem, props) {
    inject(function ($rootScope, $compile, _$timeout_) {
      $timeout = _$timeout_;
      $parentScope = $rootScope;
      _.assign($parentScope, props);

      $compile($elem)($parentScope);

      // I think the prereq requires this?
      $timeout(function () {
        $elem.scope().$digest();
      }, 0);

      $scope = $elem.isolateScope();

    });
  };

  var destroy = function () {
    $scope.$destroy();
    $parentScope.$destroy();
  };

  describe('docTable', function () {
    var $elem;

    beforeEach(module('kibana'));
    beforeEach(function () {
      $elem = angular.element('<doc-table search-source="searchSource" columns="columns" sorting="sorting"></doc-table>');
      inject(function (Private) {
        searchSource = Private(require('fixtures/stubbed_search_source'));
      });
      init($elem, {
        searchSource: searchSource,
        columns: [],
        sorting: ['@timestamp', 'desc']
      });
      $scope.$digest();

    });

    afterEach(function () {
      destroy();
    });

    it('should compile', function () {
      expect($elem.text()).to.not.be.empty();
    });

    it('should have an addRows function', function () {
      expect($scope.addRows).to.be.a(Function);
    });

    it('should set the indexPattern to that of the searchSource', function () {
      expect($scope.indexPattern).to.be(searchSource.get('index'));
    });

    it('should set size and sort on the searchSource', function () {
      expect($scope.searchSource.sort.called).to.be(true);
      expect($scope.searchSource.size.called).to.be(true);
    });

    it('should set a row limit when results are received', function () {
      expect($scope.limit).to.be(undefined);
      searchSource.crankResults();
      $scope.$digest();
      expect($scope.limit).to.be(50);
    });

  });
});