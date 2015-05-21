define(function (require) {
  return ['getSeries', function () {
    var _ = require('lodash');
    var getSeries;

    var agg = { fieldFormatter: _.constant(_.identity) };
    var vis = { type: { seriesShouldBeInverted: _.constant(false) } };

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
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3]
      ].map(wrapRows);

      var chart = {
        aspects: {
          x: { i: 0, title: '' },
          y: { i: 1, title: '' },
          z: { i: 2, title: '' }
        }
      };

      var series = getSeries(rows, chart, vis);

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
        expect(point)
          .to.have.property('x', 1)
          .and.property('y', 2)
          .and.property('z', 3);
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
          x: { i: 0, title: '' },
          y: [
            { i: 1, title: '0', col: { title: '0' }, agg: { id: 1 } },
            { i: 2, title: '1', col: { title: '1' }, agg: { id: 2 } },
          ]
        }
      };

      var series = getSeries(rows, chart, vis);

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
        ['1', 'NaN'],
        ['0', 3],
        ['0', 'NaN'],
        ['1', 3],
        ['0', 3],
        ['1', 3]
      ].map(wrapRows);

      var chart = {
        aspects: {
          x: { i: -1, title: '' },
          series: { i: 0, agg: agg, title: '' },
          y: { i: 1, title: '', col: { title: '0' } }
        }
      };

      var series = getSeries(rows, chart, vis);

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

    it('produces multiple series if there is a series aspect and multiple y aspects', function () {
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
          x: { i: -1, title: '' },
          series: { i: 0, title: '', agg: agg },
          y: [
            { i: 1, title: '2', col: { title: '2' }, agg: { id: 1 } },
            { i: 2, title: '3', col: { title: '3' }, agg: { id: 2 } }
          ]
        }
      };

      var series = getSeries(rows, chart, vis);

      expect(series)
        .to.be.an('array')
        .and.to.have.length(4); // two series * two metrics

      checkSiri(series[0], '0: 2', 3);
      checkSiri(series[1], '1: 2', 3);
      checkSiri(series[2], '0: 3', 4);
      checkSiri(series[3], '1: 3', 4);

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

    it('produces a series list in the same order as its corresponding metric column', function () {
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
          x: { i: -1, title: '' },
          series: { i: 0, title: '', agg: agg },
          y: [
            { i: 1, title: '2', col: { title: '2' }, agg: { id: 1 } },
            { i: 2, title: '3', col: { title: '3' }, agg: { id: 2 } }
          ]
        }
      };

      var series = getSeries(rows, chart, vis);
      expect(series[0]).to.have.property('label', '0: 2');
      expect(series[1]).to.have.property('label', '1: 2');
      expect(series[2]).to.have.property('label', '0: 3');
      expect(series[3]).to.have.property('label', '1: 3');


      // switch the order of the y columns
      chart.aspects.y = chart.aspects.y.reverse();

      var series2 = getSeries(rows, chart, vis);
      expect(series2[0]).to.have.property('label', '0: 3');
      expect(series2[1]).to.have.property('label', '1: 3');
      expect(series2[2]).to.have.property('label', '0: 2');
      expect(series2[3]).to.have.property('label', '1: 2');
    });
  }];
});
