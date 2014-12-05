define(function (require) {
  return ['initXAxis', function () {
    var _ = require('lodash');

    var initXAxis;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      initXAxis = Private(require('components/agg_response/point_series/_init_x_axis'));
    }));

    var baseChart = {
      aspects: {
        x: {
          agg: {
            fieldFormatter: _.constant({}),
            write: _.constant({ params: {} }),
            type: {}
          },
          col: {
            title: 'label'
          }
        }
      }
    };

    it('sets the xAxisFormatter if the agg is not ordered', function () {
      var chart = _.cloneDeep(baseChart);
      initXAxis(chart);
      expect(chart)
        .to.have.property('xAxisLabel', 'label')
        .and.have.property('xAxisFormatter', chart.aspects.x.agg.fieldFormatter());
    });

    it('makes the chart ordered if the agg is ordered', function () {
      var chart = _.cloneDeep(baseChart);
      chart.aspects.x.agg.type.ordered = true;

      initXAxis(chart);
      expect(chart)
        .to.have.property('xAxisLabel', 'label')
        .and.have.property('xAxisFormatter', chart.aspects.x.agg.fieldFormatter())
        .and.have.property('ordered');

      expect(chart.ordered)
        .to.be.an('object')
        .and.not.have.property('interval');
    });

    it('reads the interval param from the x agg', function () {
      var chart = _.cloneDeep(baseChart);
      chart.aspects.x.agg.type.ordered = true;
      chart.aspects.x.agg.write = _.constant({ params: { interval: 10 } });

      initXAxis(chart);
      expect(chart)
        .to.have.property('xAxisLabel', 'label')
        .and.have.property('xAxisFormatter', chart.aspects.x.agg.fieldFormatter())
        .and.have.property('ordered');

      expect(chart.ordered)
        .to.be.an('object')
        .and.have.property('interval', 10);
    });
  }];
});