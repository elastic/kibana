define(function (require) {
  var Courier = require('courier/courier');

  describe('Courier Module', function () {

    it('provides a constructor for the Courier classs', function () {
      var courier = new Courier();
      expect(courier).to.be.a(Courier);
    });

    it('knows when a DataSource object has event listeners for the results event');
    it('executes queries on the interval for searches that have listeners for results');

    describe('::new', function () {
      it('requires a config object which will be passed to the .');
    });

    describe('events', function () {
      describe('error', function () {
        it('emits when any request comes back with an error');
        it('emits multiple times when multiple requests error');
        it('hander is called with the client error object, and the DataSource object to which the error relates');
      });
    });

    describe('sync API', function () {
      var courier;
      beforeEach(function () {
        courier = new Courier();
      });

      afterEach(function () {
        courier.close();
      });

      describe('#fetchInterval', function () {
        it('sets the interval in milliseconds that queries will be fetched', function () {
          courier.fetchInterval(1000);
          expect(courier._state()).to.have.property('fetchInterval', 1000);
        });
      });

      describe('#define', function () {
        it('creates an empty (match all) DataSource object', function () {
          var source = courier.define();
          expect(source._state()).to.eql({});
        });
        it('optionally accepts a json object/string that will populate the DataSource object with settings');
      });
    });

    describe('async API', function () {
      describe('#fetch', function () {
        it('crawls the DataSource objects which are listening for results.');
        it('uses aggregated filter/aggs/etc to create serialized es-DSL request');
        it('sends the serialized es-dsl requests in a single /msearch request.');
      });
    });
  });
});