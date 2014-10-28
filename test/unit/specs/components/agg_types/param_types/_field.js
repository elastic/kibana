define(function (require) {
  return ['Field', function () {
    var _ = require('lodash');

    var BaseAggParam;
    var FieldAggParam;

    beforeEach(module('kibana'));
    // fetch out deps
    beforeEach(inject(function (Private) {
      BaseAggParam = Private(require('components/agg_types/param_types/base'));
      FieldAggParam = Private(require('components/agg_types/param_types/field'));
    }));

    describe('constructor', function () {
      it('it is an instance of BaseAggParam', function () {
        var aggParam = new FieldAggParam({
          name: 'field'
        });

        expect(aggParam).to.be.a(BaseAggParam);
      });
    });
  }];
});