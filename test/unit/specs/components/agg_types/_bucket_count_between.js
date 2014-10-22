define(function (require) {
  return ['bucketCountBetween util', function () {
    var _ = require('lodash');
    var indexPattern;
    var Vis;
    var visTypes;
    var aggTypes;
    var AggConfig;
    var bucketCountBetween;

    // http://cwestblog.com/2014/02/25/javascript-testing-for-negative-zero/
    // works for -0 and +0
    function isNegative(n) {
      return ((n = +n) || 1 / n) < 0;
    }

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      Vis = Private(require('components/vis/vis'));
      visTypes = Private(require('registry/vis_types'));
      aggTypes = Private(require('components/agg_types/index'));
      AggConfig = Private(require('components/vis/_agg_config'));
      bucketCountBetween = Private(require('components/agg_types/buckets/_bucket_count_between'));
    }));

    it('returns a positive number when a is before b', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          },
          {
            type: 'terms',
            schema: 'segment'
          }
        ]
      });

      var a = vis.aggs.byTypeName.date_histogram[0];
      var b = vis.aggs.byTypeName.terms[0];
      var count = bucketCountBetween(a, b);
      expect(isNegative(count)).to.be(false);
    });

    it('returns a negative number when a is after b', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          },
          {
            type: 'terms',
            schema: 'segment'
          }
        ]
      });

      var a = vis.aggs.byTypeName.terms[0];
      var b = vis.aggs.byTypeName.date_histogram[0];
      var count = bucketCountBetween(a, b);
      expect(isNegative(count)).to.be(true);
    });

    it('returns 0 when there are no buckets between a and b', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          },
          {
            type: 'terms',
            schema: 'segment'
          }
        ]
      });

      var a = vis.aggs.byTypeName.date_histogram[0];
      var b = vis.aggs.byTypeName.terms[0];
      expect(bucketCountBetween(a, b)).to.be(0);
    });

    it('returns null when b is not in the aggs', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          }
        ]
      });

      var a = vis.aggs.byTypeName.date_histogram[0];
      var b = new AggConfig(vis, {
        type: 'terms',
        schema: 'segment'
      });

      expect(bucketCountBetween(a, b)).to.be(null);
    });

    it('returns null when a is not in the aggs', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          }
        ]
      });

      var a = new AggConfig(vis, {
        type: 'terms',
        schema: 'segment'
      });
      var b = vis.aggs.byTypeName.date_histogram[0];

      expect(bucketCountBetween(a, b)).to.be(null);
    });

    it('returns null when a and b are not in the aggs', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: []
      });

      var a = new AggConfig(vis, {
        type: 'terms',
        schema: 'segment'
      });

      var b = new AggConfig(vis, {
        type: 'date_histogram',
        schema: 'segment'
      });

      expect(bucketCountBetween(a, b)).to.be(null);
    });

    function countTest(pre, post) {
      return function () {
        var schemas = visTypes.byName.histogram.schemas.buckets;

        // slow for this test is actually somewhere around 1/2 a sec
        this.slow(500);

        function randBucketAggForVis(vis) {
          var schema = _.sample(schemas);
          var aggType = _.sample(aggTypes.byType.buckets);

          return new AggConfig(vis, {
            schema: schema,
            type: aggType
          });
        }

        _.times(50, function (n) {
          var vis = new Vis(indexPattern, {
            type: 'histogram',
            aggs: []
          });

          var randBucketAgg = _.partial(randBucketAggForVis, vis);

          var a = randBucketAgg();
          var b = randBucketAgg();

          // create n aggs between a and b
          var aggs = [];
          aggs.fill = function (n) {
            for (var i = 0; i < n; i++) {
              aggs.push(randBucketAgg());
            }
          };

          pre && aggs.fill(_.random(0, 10));
          aggs.push(a);
          aggs.fill(n);
          aggs.push(b);
          post && aggs.fill(_.random(0, 10));

          vis.setState({
            type: 'histogram',
            aggs: aggs
          });

          expect(bucketCountBetween(a, b)).to.be(n);
        });
      };
    }

    it('can count', countTest());
    it('can count with elements before', countTest(true));
    it('can count with elements after', countTest(false, true));
    it('can count with elements before and after', countTest(true, true));
  }];
});