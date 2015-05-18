define(function (require) {
  var _ = require('lodash');

  describe('GeoJson Agg Response Converter', function () {
    var vis;
    var tabify;
    var convert;
    var esResponse;
    var aggs;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      var Vis = Private(require('components/vis/vis'));
      var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

      esResponse = Private(require('fixtures/agg_resp/geohash_grid'));
      tabify = Private(require('components/agg_response/tabify/tabify'));
      convert = Private(require('components/agg_response/geo_json/geo_json'));

      vis = new Vis(indexPattern, {
        type: 'tile_map',
        aggs: [
          { schema: 'metric', type: 'avg', params: { field: 'bytes' } },
          { schema: 'split', type: 'terms', params: { field: '@tags' } },
          { schema: 'segment', type: 'geohash_grid', params: { field: 'geo.coordinates', precision: 3 } }
        ],
        params: {
          isDesaturated: true,
          mapType: 'Scaled%20Circle%20Markers'
        }
      });

      aggs = {
        metric: vis.aggs[0],
        split: vis.aggs[1],
        geo: vis.aggs[2]
      };
    }));

    [ { asAggConfigResults: true }, { asAggConfigResults: false } ].forEach(function (tableOpts) {

      function makeTable() {
        return _.sample(_.sample(tabify(vis, esResponse, tableOpts).tables).tables);
      }

      function makeSingleChart(table) {
        return convert(vis, table || makeTable(), tableOpts);
      }

      function makeGeoJson() {
        return makeSingleChart().geoJson;
      }

      describe('with table ' + JSON.stringify(tableOpts), function () {

        it('outputs a chart', function () {
          var chart = makeSingleChart();
          expect(chart).to.have.property('tooltipFormatter');
          expect(chart.tooltipFormatter).to.be.a('function');
          expect(chart).to.have.property('geoJson');
          expect(chart.geoJson).to.be.an('object');
        });

        it('outputs geohash points as features in a feature collection', function () {
          var table = makeTable();
          var chart = makeSingleChart(table);
          var geoJson = chart.geoJson;

          expect(geoJson.type).to.be('FeatureCollection');
          expect(geoJson.features).to.be.an('array');
          expect(geoJson.features).to.have.length(table.rows.length);
        });

        it('exports a bunch of properties about the geo hash grid', function () {
          var geoJson = makeGeoJson();
          var props = geoJson.properties;

          // props
          expect(props).to.be.an('object');

          // props.agg
          expect(props).to.have.property('agg');

          // props.agg.metric
          expect(props.agg).to.have.property('metric');
          expect(props.agg.metric).to.be(aggs.metric);

          // props.agg.geo
          expect(props.agg).to.have.property('geo');
          expect(props.agg.geo).to.be(aggs.geo);

          // props.label
          expect(props).to.have.property('label');
          expect(props.label).to.be.a('string');

          // props.length
          expect(props).to.have.property('length');
          expect(props.length).to.be(geoJson.features.length);

          // props.metricField
          expect(props).to.have.property('metricField');
          expect(props.metricField).to.be(aggs.metric.fieldName());

          // props.precision
          expect(props).to.have.property('precision');
          expect(props.precision).to.be(aggs.geo.params.precision);

          // props.valueFormatter
          expect(props).to.have.property('valueFormatter');
          expect(props.valueFormatter).to.be(aggs.metric.fieldFormatter());
        });

        describe('properties', function () {
          it('includes one feature per row in the table', function () {
            var table = makeTable();
            var chart = makeSingleChart(table);
            var geoColI = _.findIndex(table.columns, { aggConfig: aggs.geo });
            var metricColI = _.findIndex(table.columns, { aggConfig: aggs.metric });

            table.rows.forEach(function (row, i) {
              var feature = chart.geoJson.features[i];
              expect(feature).to.have.property('geometry');
              expect(feature.geometry).to.be.an('object');
              expect(feature).to.have.property('properties');
              expect(feature.properties).to.be.an('object');

              var geometry = feature.geometry;
              expect(geometry.type).to.be('Point');
              expect(geometry).to.have.property('coordinates');
              expect(geometry.coordinates).to.be.an('array');
              expect(geometry.coordinates).to.have.length(2);
              expect(geometry.coordinates[0]).to.be.a('number');
              expect(geometry.coordinates[1]).to.be.a('number');

              var props = feature.properties;
              expect(props).to.be.an('object');
              expect(props).to.have.keys('center', 'count', 'geohash', 'valueFormatted', 'valueLabel');
              expect(props.center).to.eql(geometry.coordinates);
              if (props.count != null) expect(props.count).to.be.a('number');
              expect(props.geohash).to.be.a('string');
              expect(props.valueFormatted).to.be(aggs.metric.fieldFormatter()(props.count));
              expect(props.valueLabel).to.be(aggs.metric.makeLabel());

              if (tableOpts.asAggConfigResults) {
                expect(props.aggConfigResult).to.be(row[metricColI]);
                expect(props.count).to.be(row[metricColI].value);
                expect(props.geohash).to.be(row[geoColI].value);
              } else {
                expect(props.aggConfigResult).to.be(null);
                expect(props.count).to.be(row[metricColI]);
                expect(props.geohash).to.be(row[geoColI]);
              }
            });
          });
        });

      });
    });
  });

});

