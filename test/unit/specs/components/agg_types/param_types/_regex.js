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
      it('should be an instance of BaseAggParam', function () {
        var aggParam = new RegexAggParam({
          name: 'some_param',
          type: 'regex'
        });

        expect(aggParam).to.be.a(BaseAggParam);
      });

      it('should not include param in output', function () {
        var paramName = 'exclude';
        var aggParam = new RegexAggParam({
          name: paramName,
          type: 'regex'
        });

        var aggConfig = { params: {} };
        var output = { params: {} };
        aggConfig.params[paramName] = {
          pattern: ''
        };

        expect(aggParam).to.have.property('write');

        aggParam.write(aggConfig, output);
        expect(output).to.be.an('object');
        expect(output).to.have.property('params');
        expect(output.params).not.to.have.property(paramName);
      });

      it('should include param in output', function () {
        var paramName = 'exclude';
        var aggParam = new RegexAggParam({
          name: paramName,
          type: 'regex'
        });

        var aggConfig = { params: {} };
        var output = { params: {} };
        aggConfig.params[paramName] = {
          pattern: 'testing'
        };

        expect(aggParam).to.have.property('write');

        aggParam.write(aggConfig, output);
        expect(output).to.be.an('object');
        expect(output).to.have.property('params');
        expect(output.params).to.have.property(paramName);
        expect(output.params[paramName]).to.eql({ pattern: 'testing' });
      });
    });
  }];
});