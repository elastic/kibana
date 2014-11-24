define(function (require) {
  return ['AggParams class', function () {
    var _ = require('lodash');

    var AggParams;
    var BaseAggParam;
    var FieldAggParam;
    var OptionedAggParam;
    var RegexAggParam;

    beforeEach(module('kibana'));
    // stub out the param classes before we get the AggParams
    beforeEach(inject(require('specs/components/agg_types/utils/_stub_agg_params')));
    // fetch out deps
    beforeEach(inject(function (Private) {
      AggParams = Private(require('components/agg_types/_agg_params'));
      BaseAggParam = Private(require('components/agg_types/param_types/base'));
      FieldAggParam = Private(require('components/agg_types/param_types/field'));
      OptionedAggParam = Private(require('components/agg_types/param_types/optioned'));
      RegexAggParam = Private(require('components/agg_types/param_types/regex'));
    }));

    describe('constructor args', function () {
      it('accepts an object of params defs', function () {
        var params = {
          one: {},
          two: {}
        };
        var paramLength = Object.keys(params).length + 1; // json is appended
        var aggParams = new AggParams(params);

        expect(aggParams).to.have.length(paramLength);
        expect(aggParams).to.be.an(Array);
        expect(aggParams.byName).to.have.keys(['one', 'two']);
      });

      it('accepts an array of param defs', function () {
        var params = [
          { name: 'one' },
          { name: 'two' }
        ];
        var paramLength = params.length + 1; // json is appended
        var aggParams = new AggParams(params);

        expect(aggParams).to.have.length(paramLength);
        expect(aggParams).to.be.an(Array);
        expect(aggParams.byName).to.have.keys(['one', 'two']);
      });
    });

    describe('AggParam creation', function () {
      it('Uses the FieldAggParam class for params with the name "field"', function () {
        var params = [
          { name: 'field' }
        ];
        var paramLength = params.length + 1; // json is appended
        var aggParams = new AggParams(params);

        expect(aggParams).to.have.length(paramLength);
        expect(aggParams[0]).to.be.a(FieldAggParam);
      });

      it('Uses the OptionedAggParam class for params of type "optioned"', function () {
        var params = [
          {
            name: 'interval',
            type: 'optioned'
          }
        ];
        var paramLength = params.length + 1; // json is appended
        var aggParams = new AggParams(params);

        expect(aggParams).to.have.length(paramLength);
        expect(aggParams[0]).to.be.a(OptionedAggParam);
      });

      it('Uses the RegexAggParam class for params of type "regex"', function () {
        var params = [
          {
            name: 'exclude',
            type: 'regex'
          }
        ];
        var paramLength = params.length + 1; // json is appended
        var aggParams = new AggParams(params);

        expect(aggParams).to.have.length(paramLength);
        expect(aggParams[0]).to.be.a(RegexAggParam);
      });

      it('Always converts the params to a BaseAggParam', function () {
        var params = [
          {
            name: 'height',
            editor: '<blink>high</blink>'
          },
          {
            name: 'weight',
            editor: '<blink>big</blink>'
          },
          {
            name: 'waist',
            editor: '<blink>small</blink>'
          }
        ];
        var paramLength = params.length + 1; // json is appended
        var aggParams = new AggParams(params);

        expect(BaseAggParam).to.have.property('callCount', paramLength);
        expect(FieldAggParam).to.have.property('callCount', 0);
        expect(OptionedAggParam).to.have.property('callCount', 0);

        expect(aggParams).to.have.length(paramLength);
        aggParams.forEach(function (aggParam) {
          expect(aggParam).to.be.a(BaseAggParam);
        });
      });
    });
  }];
});