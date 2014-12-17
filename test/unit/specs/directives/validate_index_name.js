define(function (require) {
  var angular = require('angular');

  // Load the kibana app dependencies.
  require('directives/validate_index_name');

  describe('Validate index name directive', function () {
    var $compile, $rootScope;
    var html = '<input type="text" ng-model="indexName" validate-index-name />';

    beforeEach(module('kibana'));

    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    }));

    it('should not accept null index name patterns', function () {
      $rootScope.indexName = null;
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept undefined index name patterns', function () {
      $rootScope.indexName = undefined;
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept empty index name patterns', function () {
      $rootScope.indexName = '';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept . as an index name pattern', function () {
      $rootScope.indexName = '.';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept .. as an index name pattern', function () {
      $rootScope.indexName = '..';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept \\ in an index name pattern', function () {
      $rootScope.indexName = 'foo\\bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept / in an index name pattern', function () {
      $rootScope.indexName = 'foo/bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept ? in an index name pattern', function () {
      $rootScope.indexName = 'foo?bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept " in an index name pattern', function () {
      $rootScope.indexName = 'foo"bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept < in an index name pattern', function () {
      $rootScope.indexName = 'foo<bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept > in an index name pattern', function () {
      $rootScope.indexName = 'foo>bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept | in an index name pattern', function () {
      $rootScope.indexName = 'foo|bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept spaces in an index name pattern', function () {
      $rootScope.indexName = 'foo bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should not accept , in an index name pattern', function () {
      $rootScope.indexName = 'foo,bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    it('should accept a valid index name pattern', function () {
      $rootScope.indexName = 'foo.bar';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.not.be.ok();
    });

    it('should accept * in an index name pattern', function () {
      $rootScope.indexName = 'foo.*';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.not.be.ok();
    });

    it('should accept [] in an index name pattern', function () {
      $rootScope.indexName = '[foo]-YYYY.MM.DD';
      var element = $compile(html)($rootScope);
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.not.be.ok();
    });
  });
});