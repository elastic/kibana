define(function (require) {
  return ['String', function () {
    var _ = require('lodash');

    var BaseAggParam;
    var StringAggParam;

    beforeEach(module('kibana'));
    // fetch out deps
    beforeEach(inject(function (Private) {
      BaseAggParam = Private(require('components/agg_types/param_types/base'));
      StringAggParam = Private(require('components/agg_types/param_types/string'));
    }));

    describe('constructor', function () {
      it('it is an instance of BaseAggParam', function () {
        var aggParam = new StringAggParam({
          name: 'field'
        });

        expect(aggParam).to.be.a(BaseAggParam);
      });
    });

    describe('write', function () {
      var aggParam;
      var aggConfig = { params: {} };
      var output = { params: {} };
      var paramName = 'exclude';

      beforeEach(function () {
        aggParam = new StringAggParam({
          name: paramName,
          type: 'regex'
        });
      });

      it('should append param by name');
      it('should not include empty input');
    });
  }];
});