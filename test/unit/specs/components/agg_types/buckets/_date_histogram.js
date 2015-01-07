define(function (require) {
  return ['Date Histogram Agg', function () {
    var _ = require('lodash');
    var moment = require('moment');

    describe('params', function () {
      var paramWriter;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        var AggParamWriter = Private(require('test_utils/agg_param_writer'));
        paramWriter = new AggParamWriter({ aggType: 'date_histogram' });
      }));

      describe('interval', function () {
        it('should accept a valid interval', function () {
          var output = paramWriter.write({ interval: 'day' });
          expect(output.params).to.have.property('interval', '86400000ms');
        });

        it('should throw an error if an invalid interval is given', function () {
          expect(function () {
            paramWriter.write({ interval: 'foo' });
          }).to.throwError();
        });

        it('should automatically pick an interval', function () {
          var output = paramWriter.write({ interval: 'auto' });
          expect(output.params.interval).to.be('30000ms');
          expect(output.metricScaleText).to.be('30 sec');
        });

        it('should scale if there are too many buckets', function () {
          var output = paramWriter.write({ interval: 'second' });
          expect(output.params.interval).to.be('10000ms');
          expect(output.metricScaleText).to.be('second');
          expect(output.metricScale).to.be(0.1);
        });

        it('should not scale if there are too many buckets and the metric is not sum or count', function () {
          paramWriter.vis.aggs.bySchemaGroup.metrics[0].type.name = 'average';
          var output = paramWriter.write({ interval: 'second' });
          expect(output).to.not.have.property('metricScale');

          paramWriter.vis.aggs.bySchemaGroup.metrics[0].type.name = 'max';
          output = paramWriter.write({ interval: 'second' });
          expect(output).to.not.have.property('metricScale');

          paramWriter.vis.aggs.bySchemaGroup.metrics[0].type.name = 'sum';
          output = paramWriter.write({ interval: 'second' });
          expect(output).to.have.property('metricScale');
        });
      });

      describe('extended_bounds', function () {
        it('should write a long value if a moment passed in', function () {
          var then = moment(0);
          var now = moment(500);
          var output = paramWriter.write({
            extended_bounds: {
              min: then,
              max: now
            }
          });

          expect(typeof output.params.extended_bounds.min).to.be('number');
          expect(typeof output.params.extended_bounds.max).to.be('number');
          expect(output.params.extended_bounds.min).to.be(then.valueOf());
          expect(output.params.extended_bounds.max).to.be(now.valueOf());


        });

        it('should write a long if a long is passed', function () {
          var then = 0;
          var now = 500;
          var output = paramWriter.write({
            extended_bounds: {
              min: then,
              max: now
            }
          });

          expect(typeof output.params.extended_bounds.min).to.be('number');
          expect(typeof output.params.extended_bounds.max).to.be('number');
          expect(output.params.extended_bounds.min).to.be(then.valueOf());
          expect(output.params.extended_bounds.max).to.be(now.valueOf());


        });
      });
    });
  }];
});
