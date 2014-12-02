define(function (require) {
  return ['getSeries', function () {

    var getSeries;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      getSeries = Private(require('components/agg_response/point_series/_get_series'));
    }));

    function wrapRows(row) {
      return row.map(function (v) {
        return { value: v };
      });
    }

    it('produces a single series with points for each row', function () {
      var rows = [
        [1, 2],
        [1, 2],
        [1, 2],
        [1, 2],
        [1, 2]
      ].map(wrapRows);

      var chart = {
        aspects: {
          x: { i: 0 },
          y: { i: 1 }
        }
      };

      var series = getSeries(rows, chart);

      expect(series)
        .to.be.an('array')
        .and.to.have.length(1);

      var siri = series[0];
      expect(siri)
        .to.be.an('object')
        .and.have.property('label', '')
        .and.have.property('values');

      expect(siri.values)
        .to.be.an('array')
        .and.have.length(5);

      siri.values.forEach(function (point) {
        expect(point).to.have.property('x', 1).and.property('y', 2);
      });
    });

    it('produces multiple series if there are multiple y aspects', function () {
      var rows = [
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3]
      ].map(wrapRows);

      var chart = {
        aspects: {
          x: { i: 0 },
          y: [
            { i: 1, col: { title: '0' }, agg: { id: 1 } },
            { i: 2, col: { title: '1' }, agg: { id: 2 } },
          ]
        }
      };

      var series = getSeries(rows, chart);

      expect(series)
        .to.be.an('array')
        .and.to.have.length(2);

      series.forEach(function (siri, i) {
        expect(siri)
          .to.be.an('object')
          .and.have.property('label', '' + i)
          .and.have.property('values');

        expect(siri.values)
          .to.be.an('array')
          .and.have.length(5);

        siri.values.forEach(function (point) {
          expect(point)
            .to.have.property('x', 1)
            .and.property('y', i + 2);
        });
      });
    });

    it('produces multiple series if there is a series aspect', function () {
      var rows = [
        ['0', 3],
        ['1', 3],
        ['0', 3],
        ['1', 3],
        ['0', 3],
        ['1', 3]
      ].map(wrapRows);

      var chart = {
        aspects: {
          x: { i: -1 },
          series: { i: 0 },
          y: { i: 1, col: { title: '0' } }
        }
      };

      var series = getSeries(rows, chart);

      expect(series)
        .to.be.an('array')
        .and.to.have.length(2);

      series.forEach(function (siri, i) {
        expect(siri)
          .to.be.an('object')
          .and.have.property('label', '' + i)
          .and.have.property('values');

        expect(siri.values)
          .to.be.an('array')
          .and.have.length(3);

        siri.values.forEach(function (point) {
          expect(point)
            .to.have.property('x', '_all')
            .and.property('y', 3);
        });
      });
    });

    it('produces multiple series if there is a series aspect and multipl y aspects', function () {
      var rows = [
        ['0', 3, 4],
        ['1', 3, 4],
        ['0', 3, 4],
        ['1', 3, 4],
        ['0', 3, 4],
        ['1', 3, 4]
      ].map(wrapRows);

      var chart = {
        aspects: {
          x: { i: -1 },
          series: { i: 0 },
          y: [
            { i: 1, col: { title: '0' }, agg: { id: 1 } },
            { i: 2, col: { title: '1' }, agg: { id: 2 } }
          ]
        }
      };

      var series = getSeries(rows, chart);

      expect(series)
        .to.be.an('array')
        .and.to.have.length(4); // two series * two metrics

      checkSiri(series[0], '0: 0', 3);
      checkSiri(series[1], '0: 1', 4);
      checkSiri(series[2], '1: 0', 3);
      checkSiri(series[3], '1: 1', 4);

      function checkSiri(siri, label, y) {
        expect(siri)
          .to.be.an('object')
          .and.have.property('label', label)
          .and.have.property('values');

        expect(siri.values)
          .to.be.an('array')
          .and.have.length(3);

        siri.values.forEach(function (point) {
          expect(point)
            .to.have.property('x', '_all')
            .and.property('y', y);
        });
      }
    });
  }];
});