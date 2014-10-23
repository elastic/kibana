define(function (require) {
  return ['pointSeriesChartDataFromTable', function () {
    this.slow(1000);

    var _ = require('lodash');
    var moment = require('moment');
    var AggConfigResult = require('components/vis/_agg_config_result');

    var pointSeriesChartDataFromTable;
    var indexPattern;
    var Table;
    var Vis;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      Vis = Private(require('components/vis/vis'));
      Table = Private(require('components/agg_response/tabify/_table'));
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      pointSeriesChartDataFromTable = Private(require('components/agg_response/point_series/point_series'));
    }));

    it('handles a table with just a count', function () {
      var vis = new Vis(indexPattern, { type: 'histogram' });
      var agg = vis.aggs[0];
      var result = new AggConfigResult(vis.aggs[0], void 0, 100, 100);

      var table = new Table();
      table.columns = [ { aggConfig: agg } ];
      table.rows.push([ result ]);

      var chartData = pointSeriesChartDataFromTable(vis, table);

      expect(chartData).to.be.an('object');
      expect(chartData.series).to.be.an('array');
      expect(chartData.series).to.have.length(1);
      var series = chartData.series[0];
      expect(series.values).to.have.length(1);
      expect(series.values[0])
        .to.have.property('x', '_all')
        .and.have.property('y', 100)
        .and.have.property('aggConfigResult', result);
    });

    it('handles a table with x and y column', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'count', schema: 'metric' },
          { type: 'date_histogram', params: { field: '@timestamp', interval: 'hour' }, schema: 'segment' }
        ]
      });

      var y = {
        agg: vis.aggs[0],
        col: { aggConfig: vis.aggs[0] },
        at: function (i) { return 100 * i; }
      };

      var x = {
        agg: vis.aggs[1],
        col: { aggConfig: vis.aggs[1] },
        at: function (i) { return moment().startOf('day').add(i, 'day').valueOf(); }
      };

      var rowCount = 3;
      var table = new Table();
      table.columns = [ x.col, y.col ];
      _.times(rowCount, function (i) {
        var date = new AggConfigResult(x.agg, void 0, x.at(i));
        table.rows.push([date, new AggConfigResult(y.agg, date, y.at(i))]);
      });

      var chartData = pointSeriesChartDataFromTable(vis, table);

      expect(chartData).to.be.an('object');
      expect(chartData.series).to.be.an('array');
      expect(chartData.series).to.have.length(1);
      var series = chartData.series[0];
      expect(series.values).to.have.length(rowCount);
      series.values.forEach(function (point, i) {
        expect(point)
          .to.have.property('x', x.at(i))
          .and.property('y', y.at(i))
          .and.property('aggConfigResult');

        expect(point.aggConfigResult)
          .to.be.an(AggConfigResult)
          .and.property('value', y.at(i))
          .and.property('$parent');

        expect(point.aggConfigResult.$parent)
          .to.have.property('value', x.at(i))
          .and.property('$parent', undefined);
      });
    });

    it('handles a table with an x and two y aspects', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
          { type: 'date_histogram', params: { field: '@timestamp', interval: 'hour' }, schema: 'segment' },
          { type: 'max', schema: 'metric', params: { field: 'bytes' } }
        ]
      });

      var avg = {
        agg: vis.aggs[0],
        col: { title: 'average', aggConfig: vis.aggs[0] },
        at: function (i) { return 75.444 * (i + 1); }
      };

      var date = {
        agg: vis.aggs[1],
        col: { title: 'date', aggConfig: vis.aggs[1] },
        at: function (i) { return moment().startOf('day').add(i, 'day').valueOf(); }
      };

      var max = {
        agg: vis.aggs[2],
        col: { title: 'maximum', aggConfig: vis.aggs[2] },
        at: function (i) { return 100 * (i + 1); }
      };

      var rowCount = 3;
      var table = new Table();
      table.columns = [ date.col, avg.col, max.col ];
      _.times(rowCount, function (i) {
        var dateResult = new AggConfigResult(date.agg, void 0, date.at(i));
        var avgResult = new AggConfigResult(avg.agg, dateResult, avg.at(i));
        var maxResult = new AggConfigResult(max.agg, dateResult, max.at(i));
        table.rows.push([dateResult, avgResult, maxResult]);
      });

      var chartData = pointSeriesChartDataFromTable(vis, table);
      expect(chartData).to.be.an('object');
      expect(chartData.series).to.be.an('array');
      expect(chartData.series).to.have.length(2);
      chartData.series.forEach(function (siri, i) {
        var metric = i === 0 ? avg : max;

        expect(siri).to.have.property('label', metric.col.label);
        expect(siri.values).to.have.length(rowCount);
        siri.values.forEach(function (point, i) {
          expect(point).to.have.property('x');
          expect(point.x).to.be.a('number');

          expect(point).to.have.property('y');
          expect(point.y).to.be.a('number');

          expect(point).to.not.have.property('series');

          expect(point).to.have.property('aggConfigResult');
          expect(point.aggConfigResult)
            .to.be.a(AggConfigResult)
            .and.have.property('aggConfig', metric.agg)
            .and.have.property('value', point.y)
            .and.to.have.property('$parent');

          expect(point.aggConfigResult.$parent)
            .to.be.an(AggConfigResult)
            .and.have.property('aggConfig', date.agg);
        });
      });
    });

    it('handles a table with an x, a series, and two y aspects', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'terms', schema: 'group', params: { field: 'extension' } },
          { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
          { type: 'date_histogram', params: { field: '@timestamp', interval: 'hour' }, schema: 'segment' },
          { type: 'max', schema: 'metric', params: { field: 'bytes' } }
        ]
      });

      var extensions = ['php', 'jpg', 'gif', 'css'];
      var term = {
        agg: vis.aggs[0],
        col: { title: 'extensions', aggConfig: vis.aggs[0] },
        at: function (i) { return extensions[i % extensions.length]; }
      };

      var avg = {
        agg: vis.aggs[1],
        col: { title: 'average', aggConfig: vis.aggs[1] },
        at: function (i) { return 75.444 * (i + 1); }
      };

      var date = {
        agg: vis.aggs[2],
        col: { title: 'date', aggConfig: vis.aggs[2] },
        at: function (i) { return moment().startOf('day').add(i, 'day').valueOf(); }
      };

      var max = {
        agg: vis.aggs[3],
        col: { title: 'maximum', aggConfig: vis.aggs[3] },
        at: function (i) { return 100 * (i + 1); }
      };

      var metricCount = 2;
      var rowsPerSegment = 2;
      var rowCount = extensions.length * rowsPerSegment;
      var table = new Table();
      table.columns = [ date.col, term.col, avg.col, max.col ];
      _.times(rowCount, function (i) {
        var dateResult = new AggConfigResult(date.agg, void 0, date.at(i));
        var termResult = new AggConfigResult(term.agg, dateResult, term.at(i));
        var avgResult = new AggConfigResult(avg.agg, termResult, avg.at(i));
        var maxResult = new AggConfigResult(max.agg, termResult, max.at(i));
        table.rows.push([dateResult, termResult, avgResult, maxResult]);
      });

      var chartData = pointSeriesChartDataFromTable(vis, table);
      expect(chartData).to.be.an('object');
      expect(chartData.series).to.be.an('array');
      // one series for each extension, and then one for each metric inside
      expect(chartData.series).to.have.length(extensions.length * metricCount);
      chartData.series.forEach(function (siri, i) {
        // figure out the metric used to create this series
        var metricAgg = siri.values[0].aggConfigResult.aggConfig;
        var metric = avg.agg === metricAgg ? avg : max;

        expect(siri.values).to.have.length(rowsPerSegment);
        siri.values.forEach(function (point) {
          expect(point).to.have.property('x');
          expect(point.x).to.be.a('number');

          expect(point).to.have.property('y');
          expect(point.y).to.be.a('number');

          expect(point).to.have.property('series');
          expect(_.contains(extensions, point.series)).to.be.ok();

          expect(point).to.have.property('aggConfigResult');
          expect(point.aggConfigResult)
            .to.be.a(AggConfigResult)
            .and.have.property('aggConfig', metric.agg)
            .and.have.property('value', point.y)
            .and.to.have.property('$parent');

          expect(point.aggConfigResult.$parent)
            .to.be.an(AggConfigResult)
            .and.have.property('aggConfig', term.agg);
        });
      });
    });
  }];
});
