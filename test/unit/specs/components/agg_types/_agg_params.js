define(function (require) {
  return ['AggParams class', function () {
    var _ = require('lodash');

    var AggParams;
    var BaseAggParam;
    var FieldAggParam;
    var OptionedAggParam;

    beforeEach(module('kibana'));
    // stub out the param classes before we get the AggParams
    beforeEach(inject(require('specs/components/agg_types/utils/stub_agg_params')));
    // fetch out deps
    beforeEach(inject(function (Private) {
      AggParams = Private(require('components/agg_types/_agg_params'));
      BaseAggParam = Private(require('components/agg_types/param_types/base'));
      FieldAggParam = Private(require('components/agg_types/param_types/field'));
      OptionedAggParam = Private(require('components/agg_types/param_types/optioned'));
    }));

    describe('constructor args', function () {
      it('accepts an object of params defs', function () {
        var aggParams = new AggParams({
          one: {},
          two: {}
        });

        expect(aggParams).to.have.length(2);
        expect(aggParams).to.be.an(Array);
        expect(aggParams.byName).to.have.keys(['one', 'two']);
      });

      it('accepts an array of param defs', function () {
        var aggParams = new AggParams([
          { name: 'one' },
          { name: 'two' }
        ]);

        expect(aggParams).to.have.length(2);
        expect(aggParams).to.be.an(Array);
        expect(aggParams.byName).to.have.keys(['one', 'two']);
      });
    });

    describe('AggParam creation', function () {
      it('Uses the FieldAggParam class for params with the name "field"', function () {
        var aggParams = new AggParams([
          { name: 'field' }
        ]);

        expect(aggParams).to.have.length(1);
        expect(aggParams[0]).to.be.a(FieldAggParam);
        expect(aggParams[0]).to.be.a(BaseAggParam);
      });

      it('Uses the OptionedAggParam class for params with defined options', function () {
        var aggParams = new AggParams([
          {
            name: 'interval',
            options: [
              { display: 'Automatic', val: 'auto' },
              { display: '2 Hours', val: '2h' }
            ]
          }
        ]);

        expect(aggParams).to.have.length(1);
        expect(aggParams[0]).to.be.a(OptionedAggParam);
        expect(aggParams[0]).to.be.a(BaseAggParam);
      });

      it('Always converts the params to a BaseAggParam', function () {
        var aggParams = new AggParams([
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
        ]);

        expect(BaseAggParam).to.have.property('callCount', 3);
        expect(FieldAggParam).to.have.property('callCount', 0);
        expect(OptionedAggParam).to.have.property('callCount', 0);

        expect(aggParams).to.have.length(3);
        aggParams.forEach(function (aggParam) {
          expect(aggParam).to.be.a(BaseAggParam);
        });
      });
    });
  }];
});