define(function (require) {
  var stubbedClient = require('test_utils/stubbed_client');
  var createCourier = require('test_utils/create_courier');
  var _ = require('lodash');

  return function extendCourierSuite() {
    describe('#abort', function () {
      it('calls abort on the current request if it exists', function () {
        var client = stubbedClient();
        var courier = createCourier({ client: client });

        courier
          .createSource('search')
          .on('results', _.noop);

        courier.abort();
        expect(client.abortCalled).to.eql(0);

        courier.fetch('search');
        courier.abort();
        expect(client.abortCalled).to.eql(1);
      });
    });
  };
});