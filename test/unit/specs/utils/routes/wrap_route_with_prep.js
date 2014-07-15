define(function (require) {
  var routes = require('routes');
  var getRouteProvider = require('./_get_route_provider');
  var wrapRouteWithPrep = require('utils/routes/_wrap_route_with_prep');
  var Promise = require('bluebird');
  var _ = require('lodash');
  var stub = require('test_utils/auto_release_sinon').stub;

  return function () {
    describe('wrapRouteWithPrep fn', function () {
      require('test_utils/no_digest_promises').activateForSuite();

      var $injector;
      beforeEach(function (_$injector_) { $injector = _$injector_; });

      it('adds a __prep__ resolve, which does some setup work, then some user work', function () {
        var i = 0;
        var next = function () {
          return _.partial(Promise.resolve, i++);
        };

        stub(wrapRouteWithPrep, 'oneTimeSetup', Promise.resolve);
        stub(wrapRouteWithPrep, 'setupComplete', Promise.resolve);

        var route = {
          resolve: {
            userWork1: next,
            userWork2: next,
            userWork3: next,
            userWork4: next
          }
        };
        wrapRouteWithPrep(route);

        return Promise.props(_.mapValues(route.resolve, _.limit($injector.invoke, 1)))
        .then(function (resolve) {
          expect(resolve.__prep__).to.be('delayed_first');
          expect(resolve.userWork1).to.be.above(0);
          expect(resolve.userWork2).to.be.above(0);
          expect(resolve.userWork3).to.be.above(0);
          expect(resolve.userWork4).to.be.above(0);
        });
      });

      var SchedulingTest = function (opts) {
        opts = opts || {};

        var delaySetup = opts.delayUserWork ? 0 : 50;
        var delayUserWork = opts.delayUserWork ? 50: 0;

        return function () {
          module('kibana/services', 'kibana/notify');
          var setupComplete = false;
          var userWorkComplete = false;
          var route;
          var Private;
          var Promise;
          var $injector;
          var $scope;

          inject(function ($rootScope, _Private_, _Promise_, _$injector_) {
            Private = _Private_;
            Promise = _Promise_;
            $injector = _$injector_;
            $scope = $rootScope.$new();
          });

          stub(
            Private(require('utils/routes/_setup')),
            'routeSetupWork',
            function () {
              return new Promise(function (resolve, reject) {
                setTimeout(function () {
                  setupComplete = true;
                  resolve();
                  $scope.$apply();
                }, 50);
              });
            }
          );

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

              $scope.$apply();
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