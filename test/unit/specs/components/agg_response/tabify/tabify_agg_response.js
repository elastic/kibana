define(function (require) {
  var _ = require('lodash');

  describe('Tabify Agg Response', function () {
    describe('result of a hierarchical response', function () {
      var aggId = _.partial(_.uniqueId, '_agg_fixture');
      var bucketKey = _.partial(_.uniqueId, '_bucket_key');
      var docCount = _.partial(_.random, 0, 1000);

      var tabifyAggResponse;
      var indexPattern;
      var Vis;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        tabifyAggResponse = Private(require('components/agg_response/tabify/tabify_agg_response'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        Vis = Private(require('components/vis/vis'));
      }));

      describe('with no aggs', function () {
      });

      describe('with one bucket and no metric', function () {
      });

      describe('with one bucket and one metric', function () {
      });

      describe('with three buckets and one metric', function () {
      });

      describe('with three buckets and three metrics', function () {
      });
    });
  });
});