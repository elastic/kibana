define(function (require) {
  return ['Date Histogram Agg', function () {
    var _ = require('lodash');
    var moment = require('moment');

    describe('params', function () {
      var paramWriter;
      var aggTypes;
      var AggConfig;
      var setTimeBounds;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private, $injector) {
        var AggParamWriter = Private(require('test_utils/agg_param_writer'));
        var timefilter = $injector.get('timefilter');

        aggTypes = Private(require('components/agg_types/index'));
        AggConfig = Private(require('components/vis/_agg_config'));

        paramWriter = new AggParamWriter({ aggType: 'date_histogram' });

        var now = moment();
        setTimeBounds = function (n, units) {
          timefilter.enabled = true;
          timefilter.getBounds = _.constant({
            min: now.clone().subtract(n, units),
            max: now.clone()
          });
        };
      }));

      describe('interval', function () {
        it('accepts a valid interval', function () {
          var output = paramWriter.write({ interval: 'day' });
          expect(output.params).to.have.property('interval', '1d');
        });

        it('ignores invalid intervals', function () {
          var output = paramWriter.write({ interval: 'foo' });
          expect(output.params).to.have.property('interval', '0ms');
        });

        it('automatically picks an interval', function () {
          setTimeBounds(15, 'minutes');
          var output = paramWriter.write({ interval: 'auto' });
          expect(output.params.interval).to.be('30s');
        });

        it('scales up the interval if it will make too many buckets', function () {
          setTimeBounds(30, 'minutes');
          var output = paramWriter.write({ interval: 'second' });
          expect(output.params.interval).to.be('10s');
          expect(output.metricScaleText).to.be('second');
          expect(output.metricScale).to.be(0.1);
        });

        it('does not scale down the interval', function () {
          setTimeBounds(1, 'minutes');
          var output = paramWriter.write({ interval: 'hour' });
          expect(output.params.interval).to.be('1h');
          expect(output.metricScaleText).to.be(undefined);
          expect(output.metricScale).to.be(undefined);
        });

        describe('only scales when all metrics are sum or count', function () {
          var tests = [
            [ false, 'avg', 'count', 'sum' ],
            [ true, 'count', 'sum' ],
            [ false, 'count', 'cardinality' ]
          ];

          tests.forEach(function (test) {
            var should = test.shift();
            var typeNames = test.slice();

            it(typeNames.join(', ') + ' should ' + (should ? '' : 'not') + ' scale', function () {
              setTimeBounds(1, 'year');

              var vis = paramWriter.vis;
              vis.aggs.splice(0);

              var histoConfig = new AggConfig(vis, {
                type: aggTypes.byName.date_histogram,
                schema: 'segment',
                params: { interval: 'second' }
              });

              vis.aggs.push(histoConfig);

              typeNames.forEach(function (type) {
                vis.aggs.push(new AggConfig(vis, {
                  type: aggTypes.byName[type],
                  schema: 'metric'
                }));
              });

              var output = histoConfig.write();
              expect(_.has(output, 'metricScale')).to.be(should);
            });
          });
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
