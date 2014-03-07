define(function (require) {
  var SearchSource = require('courier/data_source/search');
  var DocSource = require('courier/data_source/doc');
  var nextTick = require('utils/next_tick');
  var sinon = require('test_utils/auto_release_sinon');
  var createCourier = require('test_utils/create_courier');
  var stubbedClient = require('test_utils/stubbed_client');

  return function extendCourierSuite() {
    describe('onFetch()', function () {
      it('defers to the "fetch" method on the SearchSource class to do the fetch', function () {
        sinon.stub(SearchSource, 'fetch');

        var courier = createCourier();

        courier.fetch('search');
        expect(SearchSource.fetch.callCount).to.equal(1);
      });

      it('defers to the "validate" method on the DocSource class to determine which docs need fetching', function () {
        sinon.stub(DocSource, 'validate');

        var courier = createCourier();

        courier.fetch('doc');
        expect(DocSource.validate.callCount).to.equal(1);
      });

      it('when it receives refs from DocSource.validate, passes them back to DocSource.fetch', function (done) {
        sinon.stub(DocSource, 'validate', function (courier, refs, cb) {
          // just pass back the refs we receive
          nextTick(cb, null, refs);
        });
        sinon.spy(DocSource, 'fetch');

        var courier = createCourier({
          client: stubbedClient(function (method, params, cb) {
            cb(null, {
              docs: [
                {
                  found: true,
                  _version: 1,
                  _source: {}
                }
              ]
            });
          })
        });

        courier
          .createSource('doc')
          .index('foo').type('bar').id('bax')
          .on('results', function () {
            done();
          });

        courier.fetch('doc');
        expect(DocSource.validate.callCount).to.equal(1);
      });

      it('calls it\'s own fetch method when the interval is up and immediately schedules another fetch', function () {
        var courier = createCourier();
        var clock = sinon.useFakeTimers();

        var count = 0;
        sinon.stub(courier, 'fetch', function () {
          count++;
        });

        courier.fetchInterval(10);
        courier.start();
        expect(count).to.eql(1);
        clock.tick(10);
        expect(count).to.eql(2);
      });
    });
  };
});