define(function (require) {
  require('intern/dojo/node!../support/env_setup');

  const bdd = require('intern!bdd');
  const intern = require('intern');
  const initCallbacks = [];

  function onInit(callback) {
    initCallbacks.push(callback);
  }

  global.__kibana__intern__ = { intern, bdd, onInit };

  bdd.describe('Kibana visual regressions', function () {
    bdd.before(function () {
      initCallbacks.forEach(callback => {
        callback.call(this);
      });
    });

    require([
      'intern/dojo/node!../support/index',
      'intern/dojo/node!./home',
    ], function () {});
  });
});
