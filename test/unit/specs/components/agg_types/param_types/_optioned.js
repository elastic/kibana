define(function (require) {
  return ['Optioned', function () {
    var _ = require('lodash');

    var BaseAggParam;
    var OptionedAggParam;

    beforeEach(module('kibana'));
    // fetch out deps
    beforeEach(inject(function (Private) {
      BaseAggParam = Private(require('components/agg_types/param_types/base'));
      OptionedAggParam = Private(require('components/agg_types/param_types/optioned'));
    }));

    describe('constructor', function () {
      it('it is an instance of BaseAggParam', function () {
        var aggParam = new OptionedAggParam({
          name: 'some_param',
          type: 'optioned'
        });

        expect(aggParam).to.be.a(BaseAggParam);
      });
    });
  }];
});