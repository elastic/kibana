define(function (require) {
  return ['getPoint', function () {
    var _ = require('lodash');
    var getPoint;

    var truthFormatted = { fieldFormatter: _.constant(_.constant(true)) };
    var identFormatted = { fieldFormatter: _.constant(_.identity) };

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      getPoint = Private(require('components/agg_response/point_series/_get_point'));
    }));

    it('properly unwraps and scales values without a series', function () {
      var row = [ { value: 1 }, { value: 2 }, { value: 3 } ];
      var xAspect = { i: 0 };
      var seriesAspect = null;
      var yScale = 5;
      var yAspect = { i: 1 };
      var zAspect = { i: 2 };
      var point = getPoint(xAspect, seriesAspect, yScale, row, yAspect, zAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('y', 10)
        .and.have.property('z', 3)
        .and.have.property('aggConfigResult', row[1])
        .and.not.have.property('series');
    });

    it('properly unwraps and scales values with a series', function () {
      var row = [ { value: 1 }, { value: 2 }, { value: 3 }];
      var xAspect = { i: 0 };
      var seriesAspect = { i: 1, agg: identFormatted };
      var yScale = null;
      var yAspect = { i: 2 };
      var point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('series', 2)
        .and.have.property('y', 3)
        .and.have.property('aggConfigResult', row[2]);
    });

    it('properly formats series values', function () {
      var row = [ { value: 1 }, { value: 2 }, { value: 3 } ];
      var xAspect = { i: 0 };
      var seriesAspect = { i: 1, agg: truthFormatted };
      var yScale = null;
      var yAspect = { i: 2 };
      var point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('series', true)
        .and.have.property('y', 3)
        .and.have.property('aggConfigResult', row[2]);
    });

    it('ignores points with a y value of NaN', function () {
      var row = [ { value: 1 }, { value: 'NaN' }];
      var xAspect = { i: 0 };
      var seriesAspect = null;
      var yScale = 5;
      var yAspect = { i: 1 };
      var point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);
      expect(point).to.be(void 0);
    });

  }];
});
