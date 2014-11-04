define(function (require) {
  return ['tabifyAggResponse Simple Integration', function () {
    var _ = require('lodash');
    var fixtures = require('fixtures/fake_hierarchical_data');

    var Vis;
    var Buckets;
    var indexPattern;
    var tabifyAggResponse;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));
      Vis = Private(require('components/vis/vis'));
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
    }));

    function normalizeIds(vis) {
      vis.aggs.forEach(function (agg, i) {
        agg.id = 'agg_' + (i + 1);
      });
    }

    it('transforms a simple response properly', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: []
      });
      normalizeIds(vis);

      var resp = tabifyAggResponse(vis, fixtures.metricOnly, { canSplit: false });

      expect(resp).to.not.have.property('tables');
      expect(resp).to.have.property('rows').and.property('columns');
      expect(resp.rows).to.have.length(1);
      expect(resp.columns).to.have.length(1);

      expect(resp.rows[0]).to.eql([1000]);
      expect(resp.columns[0]).to.have.property('aggConfig', vis.aggs[0]);
    });

    it('transforms a complex response properly', function () {
      var vis = new Vis(indexPattern, {
        type: 'pie',
        aggs: [
          { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
          { type: 'terms', schema: 'split', params: { field: 'extension' } },
          { type: 'terms', schema: 'segment', params: { field: 'geo.src' } },
          { type: 'terms', schema: 'segment', params: { field: 'machine.os' } }
        ]
      });
      normalizeIds(vis);

      var avg = vis.aggs[0];
      var ext = vis.aggs[1];
      var src = vis.aggs[2];
      var os = vis.aggs[3];
      var esResp = _.cloneDeep(fixtures.threeTermBuckets);
      // remove the buckets for css              in MX
      esResp.aggregations.agg_2.buckets[1].agg_3.buckets[0].agg_4.buckets = [];
      var resp = tabifyAggResponse(vis, esResp);

      function verifyExtensionSplit(tableGroup, key) {
        expect(tableGroup).to.have.property('tables');
        expect(tableGroup).to.have.property('aggConfig', ext);
        expect(tableGroup).to.have.property('key', key);
        expect(tableGroup.tables).to.have.length(1);

        tableGroup.tables.forEach(function (table) {
          verifyTable(table, key);
        });
      }

      function verifyTable(table, splitKey) {
        expect(table.columns).to.have.length(4);
        expect(table.columns[0]).to.have.property('aggConfig', src);
        expect(table.columns[1]).to.have.property('aggConfig', avg);
        expect(table.columns[2]).to.have.property('aggConfig', os);
        expect(table.columns[3]).to.have.property('aggConfig', avg);

        table.rows.forEach(function (row) {
          expect(row).to.have.length(4);

          // two character country code
          expect(row[0]).to.be.a('string');
          expect(row[0]).to.have.length(2);

          // average bytes
          expect(row[1]).to.be.a('number');
          expect(row[1] === 0 || row[1] > 1000).to.be.ok();

          if (splitKey === 'css' && row[0] === 'MX') {
            // removed these buckets, we should get empty values
            expect(row[2]).to.be('');
            expect(row[3]).to.be('');
          } else {
            // os
            expect(row[2]).to.match(/^(win|mac|linux)$/);

            // average bytes
            expect(row[3]).to.be.a('number');
            expect(row[3] === 0 || row[3] > 1000).to.be.ok();
          }
        });
      }

      expect(resp).to.have.property('tables');
      expect(resp.tables).to.have.length(3);
      verifyExtensionSplit(resp.tables[0], 'png');
      verifyExtensionSplit(resp.tables[1], 'css');
      verifyExtensionSplit(resp.tables[2], 'html');
    });
  }];
});