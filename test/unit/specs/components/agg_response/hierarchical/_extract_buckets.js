define(function (require) {
  var extractBuckets = require('components/agg_response/hierarchical/_extract_buckets');

  describe('buildHierarchicalData()', function () {
    describe('extractBuckets()', function () {

      it('should normalize a bucket object into an array', function () {

        var bucket = {
          buckets: {
            foo: { doc_count: 1 },
            bar: { doc_count: 2 }
          }
        };

        var buckets = extractBuckets(bucket);
        expect(buckets).to.be.an(Array);
        expect(buckets).to.have.length(2);
        expect(buckets[0]).to.have.property('key', 'foo');
        expect(buckets[0]).to.have.property('doc_count', 1);
        expect(buckets[1]).to.have.property('key', 'bar');
        expect(buckets[1]).to.have.property('doc_count', 2);
      });

      it('should return an empty array for undefined buckets', function () {
        var buckets = extractBuckets();
        expect(buckets).to.be.an(Array);
        expect(buckets).to.have.length(0);
      });

      it('should return the bucket array', function () {
        var bucket =  {
          buckets: [
            { key: 'foo', doc_count: 1 },
            { key: 'bar', doc_count: 2 }
          ]
        };
        var buckets = extractBuckets(bucket);
        expect(buckets).to.be.an(Array);
        expect(buckets).to.be(bucket.buckets);
      });

    });
  });
});
