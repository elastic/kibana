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
    const supportPages = [
      'intern/dojo/node!../support/page_objects',
      'intern/dojo/node!../support'
    ];

    const requestedApps = process.argv.reduce((previous, arg) => {
      const option = arg.split('=');
      const key = option[0];
      const value = option[1];
      if (key === 'appSuites' && value) return value.split(',');
    });

    const apps = [
      'intern/dojo/node!./apps/xpack',
      'intern/dojo/node!./apps/discover',
      'intern/dojo/node!./apps/management',
      'intern/dojo/node!./apps/visualize',
      'intern/dojo/node!./apps/console',
      'intern/dojo/node!./apps/dashboard',
      'intern/dojo/node!./status_page'
    ].filter((suite) => {
      if (!requestedApps) return true;
      return requestedApps.reduce((previous, app) => {
        return previous || ~suite.indexOf(app);
      }, false);
    });

    require(supportPages.concat(apps), (loadedPageObjects, loadedSupport) => {
      PageObjects = loadedPageObjects;
      support = loadedSupport;
    });
  });
});
