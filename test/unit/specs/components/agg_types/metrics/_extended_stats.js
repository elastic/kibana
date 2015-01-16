define(function (require) {
  return ['¡Extended Stats!', function () {
    var _ = require('lodash');
    var $ = require('jquery');

    var vis;
    var agg;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      var Vis = Private(require('components/vis/vis'));
      var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

      // the vis which wraps the agg
      vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'extended_stats', params: { field: 'bytes' } }
        ]
      });

      // the extended_stats agg
      agg = vis.aggs[0];

    }));

    describe('#makeLabel', function () {
      it('makes pretty labels', function () {
        expect(agg.makeLabel()).to.be('Extended Stats on bytes');
      });
    });

    describe('names param', function () {
      it('defaults to the full metric list', function () {
        expect(_.size(agg.params.names)).to.be.greaterThan(0);
        expect(agg.params.names).to.eql(agg.type.statNames);
      });

      describe('editor controller', function () {
        var $el;
        var $scope;
        var $rootScope;

        beforeEach(inject(function ($injector, $compile) {
          $rootScope = $injector.get('$rootScope');

          $scope = $rootScope.$new();
          $scope.agg = agg;
          $scope.aggParam = agg.type.params.byName.names;

          $el = $($scope.aggParam.editor);
          $compile($el)($scope);
        }));

        afterEach(function () {
          $el.remove();
          $scope.$destroy();
        });

        it('reflects the selected names as selected checkboxes', function () {
          agg.params.names = _.sample(agg.type.statNames, 3);
          $rootScope.$apply();

          var $checks = $el.find('input[type=checkbox]');
          expect($checks).to.have.length(agg.type.statNames.length);

          $checks.each(function () {
            var $check = $(this);
            var name = $check.parent().text().trim();
            var index = agg.params.names.indexOf(name);

            if (!$check.is(':checked')) expect(index).to.be(-1);
            else expect(index).to.be.greaterThan(-1);
          });
        });

        it('syncs the checked boxes with the name list', function () {
          agg.params.names = [];
          $rootScope.$apply();

          var $checks = $el.find('input[type=checkbox]');
          expect($checks).to.have.length(agg.type.statNames.length);

          $checks.each(function (i) {
            var $check = $(this).click();
            $rootScope.$apply();

            var name = $check.parent().text().trim();
            var index = agg.params.names.indexOf(name);
            expect(index).to.be(i);
            expect(agg.params.names).to.have.length(i + 1);
          });
        });
      });
    });

    describe('#getResponseAggs', function () {
      it('creates a response agg for each name', function () {
        var aggs = agg.type.getResponseAggs(agg);
        expect(agg.params.names).to.eql(_.pluck(aggs, 'key'));
      });
    });
  }];
});