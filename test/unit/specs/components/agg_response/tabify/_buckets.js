define(function (require) {
  return ['Buckets wrapper', function () {
    var Buckets;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      Buckets = Private(require('components/agg_response/tabify/_buckets'));
    }));


    function test(aggResp, count, keys) {
      it('reads the length', function () {
        var buckets = new Buckets(aggResp);
        expect(buckets).to.have.length(count);
      });

      it('itterates properly, passing in the key', function () {
        var buckets = new Buckets(aggResp);
        var keysSent = [];
        buckets.forEach(function (bucket, key) {
          keysSent.push(key);
        });

        expect(keysSent).to.have.length(count);
        expect(keysSent).to.eql(keys);
      });
    }

    describe('with object style buckets', function () {
      var aggResp = {
        buckets: {
          '0-100': {},
          '100-200': {},
          '200-300': {}
        }
      };

      var count = 3;
      var keys = ['0-100', '100-200', '200-300'];

      test(aggResp, count, keys);
    });

    describe('with array style buckets', function () {
      var aggResp = {
        buckets: [
          { key: '0-100', value: {} },
          { key: '100-200', value: {} },
          { key: '200-300', value: {} }
        ]
      };

      var count = 3;
      var keys = ['0-100', '100-200', '200-300'];

      test(aggResp, count, keys);
    });
  }];
});