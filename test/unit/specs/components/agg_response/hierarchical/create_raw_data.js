define(function (require) {
  var _ = require('lodash');
  var fixtures = require('fixtures/fake_hierarchical_data');
  var createRawData = require('components/agg_response/hierarchical/_create_raw_data');
  var arrayToLinkedList = require('components/agg_response/hierarchical/_array_to_linked_list');

  var AggConfigs;
  var Vis;
  var indexPattern;

  describe('buildHierarchicalData()', function () {
    describe('createRawData()', function () {
      var vis, results;

      beforeEach(module('kibana'));

      beforeEach(inject(function (Private) {
        Vis = Private(require('components/vis/vis'));
        AggConfigs = Private(require('components/vis/_agg_configs'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      }));

      beforeEach(function () {
        var id = 1;
        vis = new Vis(indexPattern, {
          type: 'pie',
          aggs: [
            { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
            { type: 'terms', schema: 'split', params: { field: 'extension' }},
            { type: 'terms', schema: 'segment', params: { field: 'machine.os' }},
            { type: 'terms', schema: 'segment', params: { field: 'geo.src' }}
          ]
        });
        var buckets = arrayToLinkedList(vis.aggs.bySchemaGroup.buckets);
        // We need to set the aggs to a known value.
        _.each(vis.aggs, function (agg) { agg.id = 'agg_' + id++; });
        results = createRawData(vis, fixtures.threeTermBuckets);
      });

      it('should have columns set', function () {
        expect(results).to.have.property('columns');
        expect(results.columns).to.have.length(6);
        _.each(results.columns, function (column) {
          expect(column).to.have.property('aggConfig');
          var agg = column.aggConfig;
          expect(column).to.have.property('categoryName', agg.schema.name);
          expect(column).to.have.property('id', agg.id);
          expect(column).to.have.property('aggType', agg.type);
          expect(column).to.have.property('field', agg.params.field);
          expect(column).to.have.property('label', agg.type.makeLabel(agg));
        });
        expect(results.columns[0].aggConfig.id).to.be('agg_2');
        expect(results.columns[1].aggConfig.id).to.be('agg_1');
        expect(results.columns[2].aggConfig.id).to.be('agg_3');
        expect(results.columns[3].aggConfig.id).to.be('agg_1');
        expect(results.columns[4].aggConfig.id).to.be('agg_4');
        expect(results.columns[5].aggConfig.id).to.be('agg_1');
      });

      it('should have rows set', function () {
        expect(results).to.have.property('rows');
        expect(results.rows).to.eql([
          ['png', 412032, 'IT', 9299, 'win', 0],
          ['png', 412032, 'IT', 9299, 'mac', 9299],
          ['png', 412032, 'US', 8293, 'linux', 3992],
          ['png', 412032, 'US', 8293, 'mac', 3029],
          ['css', 412032, 'MX', 9299, 'win', 4992],
          ['css', 412032, 'MX', 9299, 'mac', 5892],
          ['css', 412032, 'US', 8293, 'linux', 3992],
          ['css', 412032, 'US', 8293, 'mac', 3029],
          ['html', 412032, 'CN', 9299, 'win', 4992],
          ['html', 412032, 'CN', 9299, 'mac', 5892],
          ['html', 412032, 'FR', 8293, 'win', 3992],
          ['html', 412032, 'FR', 8293, 'mac', 3029]
        ]);
      });

    });
  });
});
