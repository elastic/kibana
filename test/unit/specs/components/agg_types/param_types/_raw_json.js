define(function (require) {
  var _ = require('lodash');


  return ['JSON', function () {
    var paramName = 'json_test';
    var BaseAggParam;
    var JsonAggParam;
    var aggParam;
    var aggConfig;
    var output;

    function initAggParam(config) {
      config = config || {};
      var defaults = {
        name: paramName,
        type: 'json'
      };

      aggParam = new JsonAggParam(_.defaults(config, defaults));
    }

    beforeEach(module('kibana'));

    // fetch out deps
    beforeEach(inject(function (Private) {
      aggConfig = { params: {} };
      output = { params: {} };

      BaseAggParam = Private(require('components/agg_types/param_types/base'));
      JsonAggParam = Private(require('components/agg_types/param_types/raw_json'));
    }));

    describe('constructor', function () {
      it('it is an instance of BaseAggParam', function () {
        initAggParam();
        expect(aggParam).to.be.a(BaseAggParam);
      });
    });

    describe('write', function () {
      it('should do nothing when param is not defined', function () {
        initAggParam();
        expect(aggConfig.params).not.to.have.property(paramName);

        aggParam.write(aggConfig, output);
        expect(output).not.to.have.property(paramName);
      });

      it('should not append param when invalid JSON', function () {
        initAggParam();
        aggConfig.params[paramName] = 'i am not json';

        aggParam.write(aggConfig, output);
        expect(aggConfig.params).to.have.property(paramName);
        expect(output).not.to.have.property(paramName);
      });

      it('should append param when valid JSON', function () {
        initAggParam();

        var jsonData = JSON.stringify({
          new_param: 'should exist in output'
        });

        output.params['existing'] = 'true';
        aggConfig.params[paramName] = jsonData;

        aggParam.write(aggConfig, output);
        expect(aggConfig.params).to.have.property(paramName);
        expect(output.params).to.eql({
          existing: 'true',
          new_param: 'should exist in output'
        });
      });

      it('should not overwrite existing params', function () {
        initAggParam();

        var jsonData = JSON.stringify({
          new_param: 'should exist in output',
          existing: 'should be used'
        });

        output.params['existing'] = 'true';
        aggConfig.params[paramName] = jsonData;

        aggParam.write(aggConfig, output);
        expect(output.params).to.eql(JSON.parse(jsonData));
      });
    });
  }];
});