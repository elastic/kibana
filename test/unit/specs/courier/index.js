define(function (require) {
  var Courier = require('courier/courier');
  var HastyRefresh = require('courier/errors').HastyRefresh;
  var createCourier = require('test_utils/create_courier');
  var stubbedClient = require('test_utils/stubbed_client');

  describe('Courier Module', function () {

    it('provides a constructor for the Courier classs', function () {
      expect(createCourier()).to.be.a(Courier);
    });

    it('knows when a DataSource object has event listeners for the results event', function () {
      var courier = createCourier();
      var ds = courier.createSource('doc');

      expect(courier._openSources()).to.have.length(0);
      ds.on('results', function () {});
      expect(courier._openSources('doc')).to.have.length(1);
      ds.removeAllListeners('results');
      expect(courier._openSources()).to.have.length(0);
    });

    it('protects ES against long running queries by emitting HastyRefresh error', function (done) {
      var count = 0;
      var courier = createCourier({
        client: stubbedClient()
      });

      courier
        .createSource('search')
        .on('results', function () {
          done(++count > 1 ? new Error('should have only gotten one result') : null);
        });

      courier.fetch();
      courier.fetch();

      courier.on('error', function (err) {
        expect(err).to.be.a(HastyRefresh);
      });
    });

    describe('sync API', function () {
      require('./create_source')();
      require('./start_stop')();
      require('./calculate_indices')();
      require('./create_source')();
      require('./abort')();
      require('./fetch_doc_interval')();
      require('./on_fetch')();
      require('./source_merging')();
    });

    require('./events')();
    require('./data_source')();
    require('./doc_source')();
    require('./mapper')();
  });
});