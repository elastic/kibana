define(function (require) {
  return ['orderedDateAxis', function () {
    var moment = require('moment');
    var _ = require('lodash');
    var interval = require('utils/interval');

    var baseArgs = {
      vis: {
        indexPattern: {
          timeFieldName: '@timestamp'
        }
      },
      table: {
        rows: new Array(50)
      },
      chart: {
        aspects: {
          x: {
            agg: {
              write: _.constant({ params: { interval: '10m' } })
            }
          }
        }
      }
    };

    var orderedDateAxis;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      orderedDateAxis = Private(require('components/agg_response/point_series/_ordered_date_axis'));
    }));

    describe('xAxisFormatter', function () {
      it('sets the xAxisFormatter', function () {
        var args = _.cloneDeep(baseArgs);
        orderedDateAxis(args.vis, args.table, args.chart);

        expect(args.chart).to.have.property('xAxisFormatter');
        expect(args.chart.xAxisFormatter).to.be.a('function');
      });

      it('formats values using moment, and returns strings', function () {
        var args = _.cloneDeep(baseArgs);
        orderedDateAxis(args.vis, args.table, args.chart);

        var val = '2014-08-06T12:34:01';
        expect(args.chart.xAxisFormatter(val))
          .to.be(moment(val).format('hh:mm:ss'));
      });
    });

    describe('ordered object', function () {
      it('sets date: true', function () {
        var args = _.cloneDeep(baseArgs);
        orderedDateAxis(args.vis, args.table, args.chart);

        expect(args.chart)
          .to.have.property('ordered');

        expect(args.chart.ordered)
          .to.have.property('date', true);
      });

      it('sets interval after parsing the output of the x.agg', function () {
        var args = _.cloneDeep(baseArgs);
        orderedDateAxis(args.vis, args.table, args.chart);
        expect(args.chart.ordered.interval).to.be(interval.toMs('10m'));
      });

      it('sets the min and max when the indexPattern has a timeField', function () {
        var args = _.cloneDeep(baseArgs);
        orderedDateAxis(args.vis, args.table, args.chart);

        expect(args.chart.ordered.min).to.be.a('number');
        expect(args.chart.ordered.max).to.be.a('number');

        args = _.cloneDeep(baseArgs);
        delete args.vis.indexPattern.timeFieldName;
        orderedDateAxis(args.vis, args.table, args.chart);

        expect(args.chart.ordered)
          .to.not.have.property('min')
          .and.not.have.property('max');
      });
    });
  }];
});