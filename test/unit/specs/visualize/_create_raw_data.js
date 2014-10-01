define(function (require) {
  var _ = require('lodash');
  var fixtures = require('fixtures/fake_hierarchial_data');
  var createRawData = require('components/visualize/_create_raw_data');
  var arrayToLinkedList = require('components/visualize/_array_to_linked_list');

  var AggConfigs;
  var Vis;
  var indexPattern;

  describe('buildHierarchialData()', function () {
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
        expect(results.columns).to.have.length(4);
        _.each(results.columns, function (column) {
          expect(column).to.have.property('aggConfig');
          var agg = column.aggConfig;
          expect(column).to.have.property('categoryName', agg.schema.name);
          expect(column).to.have.property('id', agg.id);
          expect(column).to.have.property('aggType', agg.type);
          expect(column).to.have.property('field', agg.params.field);
          expect(column).to.have.property('label', agg.type.makeLabel(agg));
        });
      });

      it('should have rows set', function () {
        expect(results).to.have.property('rows');
        expect(results.rows).to.eql([
          ['png', 'IT', 'win', 4992],
          ['png', 'IT', 'mac', 5892],
          ['png', 'US', 'linux', 3992],
          ['png', 'US', 'mac', 3029],
          ['css', 'MX', 'win', 4992],
          ['css', 'MX', 'mac', 5892],
          ['css', 'US', 'linux', 3992],
          ['css', 'US', 'mac', 3029],
          ['html', 'CN', 'win', 4992],
          ['html', 'CN', 'mac', 5892],
          ['html', 'FR', 'win', 3992],
          ['html', 'FR', 'mac', 3029]
        ]);
      });

    });
  });
});
