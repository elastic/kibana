define(function (require) {
  var _ = require('lodash');

  return ['String', function () {
    var paramName = 'json_test';
    var BaseAggParam;
    var StringAggParam;
    var aggParam;
    var aggConfig;
    var output;

    function initAggParam(config) {
      config = config || {};
      var defaults = {
        name: paramName,
        type: 'string'
      };

      aggParam = new StringAggParam(_.defaults(config, defaults));
    }

    beforeEach(module('kibana'));

    // fetch our deps
    beforeEach(inject(function (Private) {
      BaseAggParam = Private(require('components/agg_types/param_types/base'));
      StringAggParam = Private(require('components/agg_types/param_types/string'));

      aggConfig = { params: {} };
      output = { params: {} };
    }));

    describe('constructor', function () {
      it('it is an instance of BaseAggParam', function () {
        initAggParam();
        expect(aggParam).to.be.a(BaseAggParam);
      });
    });

    describe('write', function () {
      it('should append param by name', function () {
        var paramName = 'testing';
        var params = {};
        params[paramName] = 'some input';

        initAggParam({ name: paramName });

        aggConfig.params = params;
        aggParam.write(aggConfig, output);

        expect(output.params).to.eql(params);
      });

      it('should not be in output with empty input', function () {
        var paramName = 'more_testing';
        var params = {};
        params[paramName] = '';

        initAggParam({ name: paramName });

        aggConfig.params = params;
        aggParam.write(aggConfig, output);

        expect(output.params).to.eql({});
      });
    });
  }];
});