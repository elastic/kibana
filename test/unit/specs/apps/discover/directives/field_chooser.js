define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');

  // Load the kibana app dependencies.
  require('services/private');
  require('plugins/discover/components/field_chooser/field_chooser');

  var $parentScope, $scope, config, indexPattern;

  // Sets up the directive, take an element, and a list of properties to attach to the parent scope.
  var init = function ($elem, props) {
    inject(function ($rootScope, $compile, _config_) {
      config = _config_;
      $parentScope = $rootScope;
      _.assign($parentScope, props);
      $compile($elem)($parentScope);
      $elem.scope().$digest();
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
      '  fields="fields"' +
      '  toggle="toggle"' +
      '  data="data"' +
      '  filter="filter"' +
      '  index-pattern="indexPattern"' +
      '  state="state">' +
      '</disc-field-chooser>'
    );

    beforeEach(module('kibana'));
    beforeEach(function () {
      inject(function (Private) {
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      });

      var hits = _.each(require('fixtures/hits.js'), function (hit) {
        hit.$$_flattened = indexPattern.flattenSearchResponse(hit._source);
      });

      init($elem, {
        fields: _.map(indexPattern.fields.raw, function (v, i) { return _.merge(v, {display: false, rowCount: i}); }),
        toggle: sinon.spy(),
        data: hits,
        filter: sinon.spy(),
        indexPattern: indexPattern
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
        expect(section.popular.text()).to.not.contain('ip');

        expect(section.unpopular.text()).to.contain('extension');
        expect(section.unpopular.text()).to.contain('area');
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
        init($elem, {
          fields: _.filter(
            _.map(indexPattern.fields.raw, function (v, i) { return _.merge(v, {display: false, rowCount: i}); }),
            {count: 0}
          ),
          toggle: sinon.spy(),
          data: require('fixtures/hits'),
          filter: sinon.spy(),
          indexPattern: indexPattern
        });

        var section = getSections($elem);
        // Remove the popular fields
        $scope.$digest();
        expect(section.popular.hasClass('ng-hide')).to.be(true);
        expect(section.popular.find('li:not(.sidebar-list-header)').length).to.be(0);
        done();
      });

      it('should move the field into selected when setting field.display', function (done) {
        var section = getSections($elem);
        indexPattern.fields.byName.bytes.display = true;
        $scope.$digest();
        expect(section.selected.text()).to.contain('bytes');
        expect(section.popular.text()).to.not.contain('bytes');

        indexPattern.fields.byName.ip.display = true;
        $scope.$digest();
        expect(section.selected.text()).to.contain('ip');
        expect(section.unpopular.text()).to.not.contain('ip');

        expect(section.popular.text()).to.contain('ssl');

        done();
      });
    });

    describe('details processing', function () {
      var field;

      beforeEach(function () {
        field = indexPattern.fields.byName.bytes;
      });

      afterEach(function () {
        delete field.details;
      });

      it('should have a details function', function (done) {
        expect($scope.details).to.be.a(Function);
        done();
      });

      it('should increase the field popularity when called', function (done) {
        var counter = field.count;
        indexPattern.popularizeField = sinon.spy();
        $scope.details(field);
        expect(indexPattern.popularizeField.called).to.be(true);
        done();
      });

      it('should append a details object to the field', function (done) {
        $scope.details(field);
        expect(field.details).to.not.be(undefined);
        done();
      });

      it('should delete the field details if they already exist', function (done) {
        $scope.details(field);
        expect(field.details).to.not.be(undefined);
        $scope.details(field);
        expect(field.details).to.be(undefined);
        done();
      });

      it('... unless recompute is true', function (done) {
        $scope.details(field);
        expect(field.details).to.not.be(undefined);
        $scope.details(field, true);
        expect(field.details).to.not.be(undefined);
        done();
      });

      it('should recalculate the details on open fields if the data changes', function () {
        $scope.details(field);
        sinon.stub($scope, 'details');
        $scope.data = [];
        $scope.$apply();
        expect($scope.details.called).to.be(true);
        $scope.details.restore();

        // close the field, make sure details isnt called again
        $scope.details(field);
        sinon.stub($scope, 'details');
        $scope.data = ['foo'];
        $scope.$apply();
        expect($scope.details.called).to.be(false);
      });
    });
  });
});