define(function (require) {
  return ['addToSiri', function () {

    var addToSiri;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      addToSiri = Private(require('components/agg_response/point_series/_add_to_siri'));
    }));

    it('creates a new series the first time it sees an id', function () {
      var series = {};
      var point = {};
      var id = 'id';
      addToSiri(series, point, id);

      expect(series).to.have.own.property(id);
      expect(series[id]).to.be.an('object');
      expect(series[id].label).to.be(id);
      expect(series[id].values).to.have.length(1);
      expect(series[id].values[0]).to.be(point);
    });

    it('adds points to existing series if id has been seen', function () {
      var series = {};
      var id = 'id';

      var point = {};
      addToSiri(series, point, id);

      var point2 = {};
      addToSiri(series, point2, id);

      expect(series).to.have.own.property(id);
      expect(series[id]).to.be.an('object');
      expect(series[id].label).to.be(id);
      expect(series[id].values).to.have.length(2);
      expect(series[id].values[0]).to.be(point);
      expect(series[id].values[1]).to.be(point2);
    });

    it('allows overriding the series label', function () {
      var series = {};
      var id = 'id';
      var label = 'label';
      var point = {};
      addToSiri(series, point, id, label);

      expect(series).to.have.own.property(id);
      expect(series[id]).to.be.an('object');
      expect(series[id].label).to.be(label);
      expect(series[id].values).to.have.length(1);
      expect(series[id].values[0]).to.be(point);
    });
  }];
});