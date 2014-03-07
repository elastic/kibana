define(function (require) {
  var stubbedClient = require('test_utils/stubbed_client');
  var createCourier = require('test_utils/create_courier');
  var sinon = require('test_utils/auto_release_sinon');
  var _ = require('lodash');

  return function extendCourierSuite() {
    describe('#(fetch|doc)Interval', function () {
      it('gets/sets the internal interval (ms) that fetchs will happen once the courier is started', function () {
        var courier = createCourier();
        courier.fetchInterval(15000);
        expect(courier.fetchInterval()).to.equal(15000);

        courier.docInterval(15001);
        expect(courier.docInterval()).to.equal(15001);
      });

      it('does not trigger a fetch when the courier is not running', function () {
        var clock = sinon.useFakeTimers();
        var courier = createCourier();
        courier.fetchInterval(1000);
        expect(clock.timeoutCount()).to.be(0);
      });

      it('resets the timer if the courier is running', function () {
        var clock = sinon.useFakeTimers();
        var courier = createCourier({
          client: stubbedClient()
        });

        // setting the
        courier.fetchInterval(10);
        courier.docInterval(10);
        courier.start();

        expect(clock.timeoutCount()).to.be(2);
        expect(_.where(clock.timeoutList(), { callAt: 10 })).to.have.length(2);

        courier.fetchInterval(1000);
        courier.docInterval(1000);
        // courier should still be running

        expect(clock.timeoutCount()).to.be(2);
        expect(_.where(clock.timeoutList(), { callAt: 1000 })).to.have.length(2);
      });
    });
  };
});