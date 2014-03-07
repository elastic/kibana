define(function (require) {
  var stubbedClient = require('test_utils/stubbed_client');
  var createCourier = require('test_utils/create_courier');

  return function extendCourierSuite() {
    describe('events', function () {
      describe('error', function () {
        it('emits when the client fails', function (done) {
          var err = new Error('Error!');
          var courier = createCourier({
            client: stubbedClient(function (method, params, cb) { cb(err); })
          });

          courier.on('error', function (emittedError) {
            expect(emittedError).to.be(err);
            done();
          });

          courier
            .createSource('search')
            .on('results', function () {
              done(new Error('did not expect results to come back'));
            });

          courier.fetch();
        });

        it('emits once for each request that fails', function (done) {
          var count = 0;
          var courier = createCourier({
            client: stubbedClient(function (method, params, cb) {
              cb(null, stubbedClient.errorReponses(2));
            })
          });

          courier.on('error', function () {
            if (++ count === 2) done();
          });

          courier
            .createSource('search')
            .on('results', function () {
              done(new Error('did not expect results to come back'));
            });

          courier
            .createSource('search')
            .on('results', function () {
              done(new Error('did not expect results to come back'));
            });

          courier.fetch();
        });

        it('sends error responses to the data source if it is listening, not the courier', function (done) {
          var courier = createCourier({
            client: stubbedClient(function (method, params, cb) {
              cb(null, stubbedClient.errorReponses(1));
            })
          });

          courier.on('error', function () {
            done(new Error('the courier should not have emitted an error'));
          });

          courier
            .createSource('search')
            .on('results', function () {
              done(new Error('did not expect results to come back'));
            })
            .on('error', function () {
              done();
            });

          courier.fetch();
        });
      });
    });
  };
});