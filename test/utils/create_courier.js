define(function (require) {

  var Courier = require('courier/courier');
  var _ = require('lodash');

  var activeCouriers = [];
  function createCourier(opts) {
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