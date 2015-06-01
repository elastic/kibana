define(function (require) {
  return ['editor', function () {
    var _ = require('lodash');
    var $ = require('jquery');

    var indexPattern;
    var vis;
    var agg;
    var render;
    var $scope;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector, $compile) {
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

      var Vis = Private(require('components/vis/vis'));

      /**
       * Render the AggParams editor for the date histogram aggregation
       *
       * @param  {object} params - the agg params to give to the date_histogram
       *                           by default
       * @return {object} - object pointing to the different inputs, keys
       *                    are the aggParam name and the value is an object
       *                    with $el, $scope, and a few helpers for getting
       *                    data from them.
       */
      render = function (params) {
        vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs:[
            { schema: 'metric', type: 'avg', params: { field: 'bytes' } },
            { schema: 'segment', type: 'date_histogram', params: params || {} }
          ]
        });

        var $el = $('<vis-editor-agg-params agg="agg" group-name="groupName"></vis-editor-agg-params>');
        var $parentScope = $injector.get('$rootScope').$new();

        agg = $parentScope.agg = vis.aggs.bySchemaName.segment[0];
        $parentScope.groupName = 'buckets';

        $compile($el)($parentScope);
        $scope = $el.scope();
        $scope.$digest();

        var $inputs = $('vis-agg-param-editor', $el);
        return _.transform($inputs.toArray(), function (inputs, e) {
          var $el = $(e);
          var $scope = $el.scope();

          inputs[$scope.aggParam.name] = {
            $el: $el,
            $scope: $scope,
            $input: function () {
              return $el.find('[ng-model]').first();
            },
            modelValue: function () {
              return this.$input().controller('ngModel').$modelValue;
            }
          };
        }, {});
      };

    }));

    describe('random field/interval', function () {
      var params;
      var field;
      var interval;

      beforeEach(inject(function (Private) {
        field = _.sample(indexPattern.fields);
        interval = _.sample(Private(require('components/agg_types/buckets/_interval_options')));
        params = render({ field: field, interval: interval });
      }));

      it('renders the field editor', function () {
        expect(agg.params.field).to.be(field);

        expect(params).to.have.property('field');
        expect(params.field).to.have.property('$el');
        expect(params.field.modelValue()).to.be(field);
      });

      it('renders the interval editor', function () {
        expect(agg.params.interval).to.be(interval);

        expect(params).to.have.property('interval');
        expect(params.interval).to.have.property('$el');
        expect(params.interval.modelValue()).to.be(interval);
      });
    });

    describe('interval "auto" and indexPattern timeField', function () {
      var params;

      beforeEach(function () {
        params = render({ field: indexPattern.timeFieldName, interval: 'auto' });
      });

      it('clears the interval when the field is changed', function () {
        expect(params.interval.modelValue().val).to.be('auto');
        expect(params.field.modelValue().name).to.be(indexPattern.timeFieldName);

        var field = _.find(indexPattern.fields, function (f) {
          return f.type === 'date' && f.name !== indexPattern.timeFieldName;
        });

        params.field.$input()
        .find('option')
        .filter(function () {
          return $(this).text().trim() === field.name;
        })
        .prop('selected', true);
        params.field.$input().change();

        expect(params.interval.modelValue()).to.be(undefined);
      });
    });

  }];
});
