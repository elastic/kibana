define(function (require) {

  var sinon = require('sinon/sinon');
  var _ = require('lodash');

  var toRestore = [];
  var toWrap = {
    stub: null,
    spy: null,
    useFakeTimers: function (clock) {
      // timeouts are indexed by their id in an array,
      // the holes make the .length property "wrong"
      clock.timeoutCount = function () {
        return clock.timeoutList().length;
      };

      clock.timeoutList = function () {
        return clock.timeouts ? clock.timeouts.filter(Boolean) : [];
      };
    }
  };

  _.forOwn(toWrap, function (modify, method) {
    var orig = sinon[method];
    sinon[method] = function () {
      var obj = orig.apply(sinon, arguments);

      // after each test this list is cleared
      if (obj.restore) toRestore.push(obj);

      if (typeof modify === 'function') modify(obj);

      return obj;
    };

    _.forOwn(orig, function (val, name) {
      sinon[method][name] = val;
    });
  });

  // helper
  sinon.decorateWithSpy = function (/* prop... */) {
    var props = _.rest(arguments, 0);

    return function ($delegate) {
      props.forEach(function (prop) {
        sinon.spy($delegate, prop);
      });

      return $delegate;
    };
  };

  afterEach(function () {
    if (!toRestore.length) return;

    _.each(toRestore, function (obj) {
      obj.restore();
    });

    toRestore = [];
  });

  return sinon;
});