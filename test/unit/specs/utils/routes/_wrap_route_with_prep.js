define(function (require) {
  var RouteManager = require('routes').RouteManager;
  var getRouteProvider = require('./_get_route_provider');
  var wrapRouteWithPrep = require('utils/routes/_wrap_route_with_prep');
  var Promise = require('bluebird');
  var _ = require('lodash');
  var stub = require('test_utils/auto_release_sinon').stub;

  require('services/private');

  var routes;

  return function () {
    describe('wrapRouteWithPrep fn', function () {
      require('test_utils/no_digest_promises').activateForSuite();

      beforeEach(function () {
        routes = new RouteManager();
      });

      var SchedulingTest = function (opts) {
        opts = opts || {};

        var delaySetup = opts.delayUserWork ? 0 : 50;
        var delayUserWork = opts.delayUserWork ? 50: 0;

        return function () {
          module('kibana', 'kibana/notify');
          var setupComplete = false;
          var userWorkComplete = false;
          var route;
          var Private;
          var Promise;
          var $injector;

          inject(function ($rootScope, _Private_, _Promise_, _$injector_) {
            Private = _Private_;
            Promise = _Promise_;
            $injector = _$injector_;
          });

          var setup = Private(require('utils/routes/_setup'));
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
  };
});