define(function (require) {

  var Courier = require('courier/courier');
  var EsTransport = require('bower_components/elasticsearch/elasticsearch').Transport;
  var StubbedClient = require('test_utils/stubbed_client');
  var _ = require('lodash');

  var activeCouriers = [];
  function createCourier(opts) {
    // allow passing in a client directly
    if (
      opts
      && (
        opts instanceof StubbedClient
        || opts.transport instanceof EsTransport
      )
    )
    {
      opts = {
        client: opts
      };
    }

    var courier = new Courier(opts);

    // after each test this list is cleared
    activeCouriers.push(courier);

    return courier;
  }

  afterEach(function () {
    if (!activeCouriers.length) return;

    _.each(activeCouriers, function (courier) {
      courier.close();
    });
    activeCouriers = [];
  });

  return createCourier;
});