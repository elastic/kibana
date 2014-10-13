define(function (require) {
  return ['Regex', function () {
    var _ = require('lodash');

    var BaseAggParam;
    var RegexAggParam;

    beforeEach(module('kibana'));
    // fetch out deps
    beforeEach(inject(function (Private) {
      BaseAggParam = Private(require('components/agg_types/param_types/base'));
      RegexAggParam = Private(require('components/agg_types/param_types/regex'));
    }));

    describe('constructor', function () {
      it('it is an instance of BaseAggParam', function () {
        var aggParam = new RegexAggParam({
          name: 'some_param',
          type: 'regex'
        });

        expect(aggParam).to.be.a(BaseAggParam);
      });
    });
  }];
});