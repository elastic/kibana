define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');
  var fieldCalculator = require('apps/discover/components/field_chooser/lib/field_calculator');

  // Load the kibana app dependencies.
  require('services/private');
  require('apps/discover/components/field_chooser/field_chooser');

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


      init($elem, {
        fields: _.map(indexPattern.fields.raw, function (v, i) { return _.merge(v, {display: false, rowCount: i}); }),
        toggle: sinon.spy(),
        data: require('fixtures/hits'),
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

      it('setting field.display should move the field into selected', function (done) {
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
        expect(field.count).to.be(counter + 1);
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

    describe('fieldCalculator', function (done) {

      it('should have a _countMissing that counts nulls & undefineds in an array', function (done) {
        var values = [['foo', 'bar'], 'foo', 'foo', undefined, ['foo', 'bar'], 'bar', 'baz', null, null, null, 'foo', undefined];
        expect(fieldCalculator._countMissing(values)).to.be(5);
        done();
      });

      describe('_groupValues', function () {
        var groups, params, values;
        beforeEach(function () {
          values = [['foo', 'bar'], 'foo', 'foo', undefined, ['foo', 'bar'], 'bar', 'baz', null, null, null, 'foo', undefined];
          params = {};
          groups = fieldCalculator._groupValues(values, params);
        });

        it('should have a _groupValues that counts values', function (done) {
          expect(groups).to.be.an(Object);
          done();
        });

        it('should throw an error if any value is a plain object', function (done) {
          expect(function () { fieldCalculator._groupValues([{}, true, false], params); })
            .to.throwError();
          done();
        });

        it('should have a a key for value in the array when not grouping array terms', function (done) {
          expect(_.keys(groups).length).to.be(3);
          expect(groups['foo']).to.be.a(Object);
          expect(groups['bar']).to.be.a(Object);
          expect(groups['baz']).to.be.a(Object);
          done();
        });

        it('should count array terms independently', function (done) {
          expect(groups['foo,bar']).to.be(undefined);
          expect(groups['foo'].count).to.be(5);
          expect(groups['bar'].count).to.be(3);
          expect(groups['baz'].count).to.be(1);
          done();
        });

        describe('grouped array terms', function (done) {
          beforeEach(function () {
            params.grouped = true;
            groups = fieldCalculator._groupValues(values, params);
          });

          it('should group array terms when passed params.grouped', function (done) {
            expect(_.keys(groups).length).to.be(4);
            expect(groups['foo,bar']).to.be.a(Object);
            done();
          });

          it('should contain the original array as the value', function (done) {
            expect(groups['foo,bar'].value).to.eql(['foo', 'bar']);
            done();
          });

          it('should count the pairs seperately from the values they contain', function (done) {
            expect(groups['foo,bar'].count).to.be(2);
            expect(groups['foo'].count).to.be(3);
            expect(groups['bar'].count).to.be(1);
            done();
          });
        });
      });

      describe('getFieldValues', function () {
        var hits = require('fixtures/real_hits.js');
        it('Should return an array of values for _source fields', function () {
          var extensions = fieldCalculator.getFieldValues(hits, indexPattern.fields.byName.extension);
          expect(extensions).to.be.an(Array);
          expect(_.filter(extensions, function (v) { return v === 'html'; }).length).to.be(8);
          expect(_.uniq(_.clone(extensions)).sort()).to.eql(['gif', 'html', 'php', 'png']);
        });

        it('Should return an array of values for core meta fields', function () {
          var types = fieldCalculator.getFieldValues(hits, indexPattern.fields.byName._type);
          expect(types).to.be.an(Array);
          expect(_.filter(types, function (v) { return v === 'apache'; }).length).to.be(18);
          expect(_.uniq(_.clone(types)).sort()).to.eql(['apache', 'nginx']);
        });
      });


      describe('getFieldValueCounts', function () {
        var params;
        beforeEach(function () {
          params = {
            data: require('fixtures/real_hits.js'),
            field: indexPattern.fields.byName.extension,
            count: 3
          };
        });

        it('counts the top 3 values', function () {
          var extensions = fieldCalculator.getFieldValueCounts(params);
          expect(extensions).to.be.an(Object);
          expect(extensions.buckets).to.be.an(Array);
          expect(extensions.buckets.length).to.be(3);
          expect(_.pluck(extensions.buckets, 'value')).to.eql(['html', 'php', 'gif']);
          expect(extensions.error).to.be(undefined);
        });

        it('fails to analyze geo and attachment types', function () {
          params.field = indexPattern.fields.byName.point;
          expect(fieldCalculator.getFieldValueCounts(params).error).to.not.be(undefined);

          params.field = indexPattern.fields.byName.area;
          expect(fieldCalculator.getFieldValueCounts(params).error).to.not.be(undefined);

          params.field = indexPattern.fields.byName.request_body;
          expect(fieldCalculator.getFieldValueCounts(params).error).to.not.be(undefined);
        });

        it('fails to analyze fields that are in the mapping, but not the data', function () {
          params.field = indexPattern.fields.byName.ip;
          expect(fieldCalculator.getFieldValueCounts(params).error).to.not.be(undefined);
        });

        it('counts the total hits', function () {
          expect(fieldCalculator.getFieldValueCounts(params).total).to.be(params.data.length);
        });

        it('counts the hits the field exists in', function () {
          params.field = indexPattern.fields.byName.phpmemory;
          expect(fieldCalculator.getFieldValueCounts(params).exists).to.be(5);
        });
      });

    });

  });

});