define(function (require) {
  return ['initYAxis', function () {
    var _ = require('lodash');

    var initYAxis;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      initYAxis = Private(require('components/agg_response/point_series/_init_y_axis'));
    }));

    function agg(onSecondaryYAxis) {
      return {
        fieldFormatter: _.constant({}),
        write: _.constant({ params: {} }),
        type: {},
        onSecondaryYAxis: onSecondaryYAxis
      };
    }

    var baseChart = function (forSecondaryYAxis) {
      return {
        aspects: {
          y: [
            { agg: agg(false), col: { title: 'y1' } },
            { agg: agg(forSecondaryYAxis), col: { title: 'y2' } },
          ],
          x: {
            agg: agg(false),
            col: { title: 'x' }
          }
        }
      };
    };

    describe('with a single y aspect', function () {
      var singleYBaseChart = _.cloneDeep(baseChart(false));
      singleYBaseChart.aspects.y = singleYBaseChart.aspects.y[0];

      it('sets the yAxisFormatter the the field formats convert fn', function () {
        var chart = _.cloneDeep(singleYBaseChart);
        initYAxis(chart);
        expect(chart).to.have.property('yAxisFormatter', chart.aspects.y.agg.fieldFormatter());
      });

      it('sets the yAxisLabel', function () {
        var chart = _.cloneDeep(singleYBaseChart);
        initYAxis(chart);
        expect(chart).to.have.property('yAxisLabel', 'y1');
      });
    });

    describe('with mutliple y aspects', function () {
      it('sets the yAxisFormatter the the field formats convert fn for the first y aspect', function () {
        var chart = _.cloneDeep(baseChart(false));
        initYAxis(chart);

        expect(chart).to.have.property('yAxisFormatter');
        expect(chart.yAxisFormatter)
          .to.be(chart.aspects.y[0].agg.fieldFormatter())
          .and.not.be(chart.aspects.y[1].agg.fieldFormatter());
      });

      it('does not set the yAxisLabel, it does not make sense to put multiple labels on the same axis', function () {
        var chart = _.cloneDeep(baseChart(false));
        initYAxis(chart);
        expect(chart).to.have.property('yAxisLabel', '');
      });

      it('sets the yAxislabel for secondary axis and use the right formatter', function () {
        var chart = _.cloneDeep(baseChart(true));
        initYAxis(chart);

        expect(chart.secondYAxisLabel).to.be(chart.aspects.y[1].col.title);
        expect(chart.secondYAxisFormatter)
          .to.be(chart.aspects.y[1].agg.fieldFormatter())
          .and.not.be(chart.aspects.y[0].agg.fieldFormatter());
      });
    });
  }];
});
