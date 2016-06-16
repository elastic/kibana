define(function (require) {
  require('intern/dojo/node!../support/env_setup');

  const bdd = require('intern!bdd');
  const intern = require('intern');
  const earliestBeforeCbs = [];

  function onEarliestBefore(cb) {
    earliestBeforeCbs.push(cb);
  }

  global.__kibana__intern__ = { intern, bdd, onEarliestBefore };

  bdd.describe('kibana', function () {
    bdd.before(function () {
      earliestBeforeCbs.forEach(cb => {
        cb.call(this);
      });
    });

    require([
      'intern/dojo/node!../support/index',
      'intern/dojo/node!./apps/discover',
      'intern/dojo/node!./status_page',
      'intern/dojo/node!./apps/management',
      'intern/dojo/node!./apps/visualize',
      'intern/dojo/node!./apps/console',
      'intern/dojo/node!./apps/dashboard'
    ], function () {});
  });
});
