'use strict'; // eslint-disable-line

define(function (require) {
  require('intern/dojo/node!../support/env_setup');

  const bdd = require('intern!bdd');
  const intern = require('intern');

  global.__kibana__intern__ = { intern, bdd };

  bdd.describe('kibana', function () {
    let PageObjects;
    let support;

    bdd.before(function () {
      PageObjects.init(this.remote);
      support.init(this.remote);
    });

    require([
      'intern/dojo/node!../support/page_objects',
      'intern/dojo/node!../support',
      'intern/dojo/node!./apps/discover',
      'intern/dojo/node!./status_page',
      'intern/dojo/node!./apps/management',
      'intern/dojo/node!./apps/visualize',
      'intern/dojo/node!./apps/console',
      'intern/dojo/node!./apps/dashboard'
    ], (loadedPageObjects, loadedSupport) => {
      PageObjects = loadedPageObjects;
      support = loadedSupport;
    });
  });
});
