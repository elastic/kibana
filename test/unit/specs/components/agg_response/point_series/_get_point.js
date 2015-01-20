define(function (require) {
  return ['getPoint', function () {

    var getPoint;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      getPoint = Private(require('components/agg_response/point_series/_get_point'));
    }));

    it('properly unwraps and scales values without a series', function () {
      var row = [ { value: 1 }, { value: 2 }];
      var point = getPoint({ i: 0 }, null, 5, row, { i: 1 });

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('y', 10)
        .and.have.property('aggConfigResult', row[1])
        .and.not.have.property('series');
    });

    it('properly unwraps and scales values with a series', function () {
      var row = [ { value: 1 }, { value: 2 }, { value: 3 }];
      var point = getPoint({ i: 0 }, { i: 1 }, null, row, { i: 2 });

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('series', 2)
        .and.have.property('y', 3)
        .and.have.property('aggConfigResult', row[2]);
    });

    it('ignores points with a y value of NaN', function () {
      var row = [ { value: 1 }, { value: 'NaN' }];
      var point = getPoint({ i: 0 }, null, 5, row, { i: 1 });
      expect(point).to.be(void 0);
    });
  }];
});