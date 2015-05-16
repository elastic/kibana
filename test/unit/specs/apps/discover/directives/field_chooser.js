define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');

  // Load the kibana app dependencies.
  require('services/private');
  require('plugins/discover/components/field_chooser/field_chooser');

  var $parentScope;
  var $scope;
  var config;
  var hits;
  var indexPattern;
  var indexPatternList;

  // Sets up the directive, take an element, and a list of properties to attach to the parent scope.
  var init = function ($elem, props) {
    inject(function ($rootScope, $compile, $timeout, _config_) {
      config = _config_;
      $parentScope = $rootScope;
      _.assign($parentScope, props);
      $compile($elem)($parentScope);

      // Required for test to run solo. Sigh
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

  describe('discover field chooser directives', function () {
    var $elem = angular.element(
      '<disc-field-chooser' +
      '  columns="columns"' +
      '  toggle="toggle"' +
      '  hits="hits"' +
      '  field-counts="fieldCounts"' +
      '  filter="filter"' +
      '  index-pattern="indexPattern"' +
      '  index-pattern-list="indexPatternList"' +
      '  state="state">' +
      '</disc-field-chooser>'
    );

    beforeEach(module('kibana'));
    beforeEach(function () {
      inject(function (Private) {
        hits = Private(require('fixtures/hits'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        indexPatternList = [ 'b', 'a', 'c' ];
      });

      var fieldCounts = _.transform(hits, function (counts, hit) {
        _(indexPattern.flattenHit(hit)).keys().each(function (key) {
          counts[key] = (counts[key] || 0) + 1;
        });
      }, {});

      init($elem, {
        columns: [],
        toggle: sinon.spy(),
        hits: hits,
        fieldCounts: fieldCounts,
        filter: sinon.spy(),
        indexPattern: indexPattern,
        indexPatternList: indexPatternList
      });

      $scope.$digest();
    });

    afterEach(function () {
      destroy();
    });

    var getSections = function (ctx) {
      return {
        selected: $('.discover-selected-fields', ctx),
        popular: $('.discover-popular-fields', ctx),
        unpopular: $('.discover-unpopular-fields', ctx),
      };
    };

    describe('Index list', function () {
      it('should be in alphabetical order', function (done) {
        expect($elem.find('li.sidebar-item-title').text()).to.be('abc');
        done();
      });
    });

    describe('Field listing', function () {
      it('should have Selected Fields, Fields and Popular Fields sections', function (done) {
        var headers = $elem.find('.sidebar-list-header');
        expect(headers.length).to.be(3);
        done();
      });

      it('should have 2 popular fields, 1 unpopular field and no selected fields', function (done) {
        var section = getSections($elem);

        expect(section.selected.find('li').length).to.be(0);

        expect(section.popular.text()).to.contain('ssl');
        expect(section.popular.text()).to.contain('@timestamp');
        expect(section.popular.text()).to.not.contain('ip\n');

        expect(section.unpopular.text()).to.contain('extension');
        expect(section.unpopular.text()).to.contain('machine.os');
        expect(section.unpopular.text()).to.not.contain('ssl');
        done();
      });


      it('should show the popular fields header if there are popular fields', function (done) {
        var section = getSections($elem);
        expect(section.popular.hasClass('ng-hide')).to.be(false);
        expect(section.popular.find('li:not(.sidebar-list-header)').length).to.be.above(0);
        done();
      });

      it('should not show the popular fields if there are not any', function (done) {

        // Re-init
        destroy();

        _.each(indexPattern.fields, function (field) { field.$$spec.count = 0;}); // Reset the popular fields
        init($elem, {
          columns: [],
          toggle: sinon.spy(),
          hits: require('fixtures/hits'),
          filter: sinon.spy(),
          indexPattern: indexPattern
        });

        var section = getSections($elem);

        $scope.$digest();
        expect(section.popular.hasClass('ng-hide')).to.be(true);
        expect(section.popular.find('li:not(.sidebar-list-header)').length).to.be(0);
        done();
      });

      it('should move the field into selected when it is added to the columns array', function (done) {
        var section = getSections($elem);
        $scope.columns.push('bytes');
        $scope.$digest();

        expect(section.selected.text()).to.contain('bytes');
        expect(section.popular.text()).to.not.contain('bytes');

        $scope.columns.push('ip');
        $scope.$digest();
        expect(section.selected.text()).to.contain('ip\n');
        expect(section.unpopular.text()).to.not.contain('ip\n');

        expect(section.popular.text()).to.contain('ssl');

        done();
      });
    });

    describe('details processing', function () {
      var field;
      function getField() { return _.find($scope.fields, { name: 'bytes' }); }

      beforeEach(function () {
        field = getField();
      });

      it('should have a details function', function () {
        expect($scope.details).to.be.a(Function);
      });

      it('should increase the field popularity when called', function () {
        indexPattern.popularizeField = sinon.spy();
        $scope.details(field);
        expect(indexPattern.popularizeField.called).to.be(true);
      });

      it('should append a details object to the field', function () {
        $scope.details(field);
        expect(field.details).to.not.be(undefined);
      });

      it('should delete the field details if they already exist', function () {
        $scope.details(field);
        expect(field.details).to.not.be(undefined);
        $scope.details(field);
        expect(field.details).to.be(undefined);
      });

      it('... unless recompute is true', function () {
        $scope.details(field);
        expect(field.details).to.not.be(undefined);
        $scope.details(field, true);
        expect(field.details).to.not.be(undefined);
      });

      it('should create buckets with formatted and raw values', function () {
        $scope.details(field);
        expect(field.details.buckets).to.not.be(undefined);
        expect(field.details.buckets[0].value).to.be(40.141592);
        expect(field.details.buckets[0].display).to.be('40.142');
      });


      it('should recalculate the details on open fields if the hits change', function () {
        $scope.hits = [
          { _source: { bytes: 1024 } }
        ];
        $scope.$apply();

        field = getField();
        $scope.details(field);
        expect(getField().details.total).to.be(1);

        $scope.hits = [
          { _source: { notbytes: 1024 } }
        ];
        $scope.$apply();
        field = getField();
        expect(field.details).to.not.have.property('total');
      });
    });
  });
});
