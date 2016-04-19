import RouteManager from 'ui/routes/route_manager';
import expect from 'expect.js';
import ngMock from 'ng_mock';

import wrapRouteWithPrep from 'ui/routes/wrap_route_with_prep';
import Promise from 'bluebird';
import _ from 'lodash';
import { stub } from 'auto-release-sinon';
import 'ui/private';


let routes;

describe('wrapRouteWithPrep fn', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  beforeEach(function () {
    routes = new RouteManager();
  });

  let SchedulingTest = function (opts) {
    opts = opts || {};

    let delaySetup = opts.delayUserWork ? 0 : 50;
    let delayUserWork = opts.delayUserWork ? 50 : 0;

    return function () {
      ngMock.module('kibana', 'kibana/notify');
      let setupComplete = false;
      let userWorkComplete = false;
      let route;
      let Private;
      let Promise;
      let $injector;

      ngMock.inject(function ($rootScope, _Private_, _Promise_, _$injector_) {
        Private = _Private_;
        Promise = _Promise_;
        $injector = _$injector_;
      });


      routes
      .addSetupWork(function () {
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
