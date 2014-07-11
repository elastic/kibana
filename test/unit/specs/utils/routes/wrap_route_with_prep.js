define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  var _ = require('lodash');
  var RouteManager = require('routes').RouteManager;
  var routes;

  require('utils/private');

  return function () {
    describe('wrap route with prep work', function () {

      beforeEach(function () {
        routes = new RouteManager();
      });

      it('creates resolves if none existed', function () {
        var exec = 0;
        routes.when('/jones', { template: '<picketfence color="white"></picketfence>' });
        routes.config({
          when: function (path, route) {
            exec += 1;
            expect(path).to.eql('/jones');
            expect(route).to.have.property('resolve');
            expect(route.resolve).to.be.an('object');
          }
        });
        expect(exec).to.be(1);
      });

      it('adds a __prep__ property to the resolve object', function () {
        var exec = 0;
        routes.when('/butter', { resolve: { toast: 'burnThatBread' } });
        routes.config({
          when: function (path, route) {
            exec += 1;
            expect(route.resolve).to.have.property('__prep__');
          }
        });
        expect(exec).to.be(1);
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

          sinon.stub(
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