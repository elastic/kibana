define(function (require) {
  var createCourier = require('test_utils/create_courier');
  var sinon = require('test_utils/auto_release_sinon');
  var stubbedClient = require('test_utils/stubbed_client');
  var HastyRefresh = require('courier/errors').HastyRefresh;
  var _ = require('lodash');

  return function extendCourierSuite() {
    describe('#start', function () {
      it('triggers a fetch and begins the fetch cycle', function (done) {
        var clock = sinon.useFakeTimers();
        var client = stubbedClient();
        var courier = createCourier({
          client: client
        });

        // TODO: check that tests that listen for resutls and call courier.fetch are running async

        courier
          .createSource('search')
          .on('results', function () { done(); });

        courier.start();
        expect(client.callCount).to.equal(1); // just msearch, no mget
        expect(clock.timeoutCount()).to.equal(2); // one for search and one for doc
      });

      it('restarts the courier if it is already running', function () {
        var clock = sinon.useFakeTimers();
        var courier = createCourier({
          client: stubbedClient()
        });

        courier.on('error', function (err) {
          // since we are calling start before the first query returns
          expect(err).to.be.a(HastyRefresh);
        });

        // set the intervals to known values
        courier.fetchInterval(10);
        courier.docInterval(10);

        courier.start();
        // one for doc, one for search
        expect(clock.timeoutCount()).to.eql(2);
        // timeouts should be scheduled for 10 ticks out
        expect(_.where(clock.timeoutList(), { callAt: 10 }).length).to.eql(2);

        clock.tick(1);

        courier.start();
        // still two
        expect(clock.timeoutCount()).to.eql(2);
        // but new timeouts, due to tick(1);
        expect(_.where(clock.timeoutList(), { callAt: 11 }).length).to.eql(2);
      });
    });

    describe('#stop', function () {
      it('cancels current and future fetches', function () {
        var clock = sinon.useFakeTimers();
        var courier = createCourier({
          client: stubbedClient()
        });

        courier.start();
        expect(clock.timeoutCount()).to.eql(2);
        courier.stop();
        expect(clock.timeoutCount()).to.eql(0);
      });
    });
  };
});