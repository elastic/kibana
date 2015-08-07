var RouteManager = require('ui/routes/RouteManager');
var expect = require('expect.js');
var ngMock = require('ngMock');

var wrapRouteWithPrep = require('ui/routes/wrapRouteWithPrep');
var Promise = require('bluebird');
var _ = require('lodash');
var stub = require('auto-release-sinon').stub;

require('ui/private');

var routes;

describe('wrapRouteWithPrep fn', function () {
  require('testUtils/noDigestPromises').activateForSuite();

  beforeEach(function () {
    routes = new RouteManager();
  });

  var SchedulingTest = function (opts) {
    opts = opts || {};

    var delaySetup = opts.delayUserWork ? 0 : 50;
    var delayUserWork = opts.delayUserWork ? 50 : 0;

    return function () {
      ngMock.module('kibana', 'kibana/notify');
      var setupComplete = false;
      var userWorkComplete = false;
      var route;
      var Private;
      var Promise;
      var $injector;

      ngMock.inject(function ($rootScope, _Private_, _Promise_, _$injector_) {
        Private = _Private_;
        Promise = _Promise_;
        $injector = _$injector_;
      });

      var setup = Private(require('ui/routes/setup'));
      stub(setup, 'routeSetupWork', function () {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            setupComplete = true;
            resolve();
          }, delaySetup);
        });
      });

      routes
        .when('/', {
          resolve: {
            test: function () {
              expect(setupComplete).to.be(true);
              userWorkComplete = true;
            }
          }
        })
        .config({
          when: function (p, _r) { route = _r; }
        });

      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          Promise.all(_.map(route.resolve, function (fn) {
            return $injector.invoke(fn);
          }))
          .then(function () {
            expect(setupComplete).to.be(true);
            expect(userWorkComplete).to.be(true);
          })
          .then(resolve, reject);

        }, delayUserWork);
      });
    };
  };

  it('always waits for setup to complete before calling user work', new SchedulingTest());

  it('does not call user work when setup fails', new SchedulingTest({ failSetup: true }));

  it('calls all user work even if it is not initialized until after setup is complete', new SchedulingTest({
    delayUserWork: false
  }));
});
