define(function (require) {
  return ['AggType Class', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var AggType;
    var AggParams;

    require('services/private');

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      var AggParamsPM = require('components/agg_types/_agg_params');
      AggParams = sinon.spy(Private(AggParamsPM));
      Private.stub(AggParamsPM, AggParams);

      AggType = Private(require('components/agg_types/_agg_type'));
    }));

    describe('constructor', function () {

      it('requires a config object as it\'s first param', function () {
        expect(function () {
          new AggType(null);
        }).to.throwError();
      });

      describe('application of config properties', function () {
        var copiedConfigProps = [
          'name',
          'title',
          'makeLabel',
          'ordered'
        ];

        describe('"' + copiedConfigProps.join('", "') + '"', function () {
          it('assigns the config value to itself', function () {
            var config = _.transform(copiedConfigProps, function (config, prop) {
              config[prop] = {};
            }, {});

            var aggType = new AggType(config);

            copiedConfigProps.forEach(function (prop) {
              expect(aggType[prop]).to.be(config[prop]);
            });
          });
        });

        describe('makeLabel', function () {
          it('makes a function when the makeLabel config is not specified', function () {
            var someGetter = function () {};

            var aggType = new AggType({
              makeLabel: someGetter
            });

            expect(aggType.makeLabel).to.be(someGetter);

            aggType = new AggType({
              name: 'pizza'
            });

            expect(aggType.makeLabel).to.be.a('function');
            expect(aggType.makeLabel()).to.be('pizza');
          });
        });

        describe('params', function () {
          it('defaults to an empty AggParams object', function () {
            var aggType = new AggType({
              name: 'smart agg'
            });

            expect(aggType.params).to.be.an(AggParams);
            expect(aggType.params.length).to.be(0);
          });

          it('passes the params arg directly to the AggParams constructor', function () {
            var params = [
              {name: 'one'},
              {name: 'two'}
            ];

            var aggType = new AggType({
              name: 'bucketeer',
              params: params
            });

            expect(aggType.params).to.be.an(AggParams);
            expect(aggType.params.length).to.be(2);
            expect(AggParams.callCount).to.be(1);
            expect(AggParams.firstCall.args[0]).to.be(params);
          });
        });
      });

    });

  }];
});