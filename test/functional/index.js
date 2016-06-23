define(function (require) {
  require('intern/dojo/node!../support/env_setup');

  const bdd = require('intern!bdd');
  const intern = require('intern');

  global.__kibana__intern__ = { intern, bdd };

  bdd.describe('kibana', function () {
    bdd.before(function () {
      this.PageObjects.init(this.remote);
    });

    require([
      'intern/dojo/node!../support/page_objects.js',
      'intern/dojo/node!../support',
      'intern/dojo/node!./apps/discover',
      // TODO: Convert the rest of these to use PageObjects.
      // 'intern/dojo/node!./status_page',
      // 'intern/dojo/node!./apps/management',
      // 'intern/dojo/node!./apps/visualize',
      // 'intern/dojo/node!./apps/console',
      // 'intern/dojo/node!./apps/dashboard'
    ], PageObjects => {
      this.PageObjects = PageObjects;
    });
  });
});
