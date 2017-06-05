import angular from 'angular';
import _ from 'lodash';
import { WorkQueue } from 'ui/routes/work_queue';

export function wrapRouteWithPrep(route, setup) {
  if (!route.resolve && route.redirectTo) return;

  const userWork = new WorkQueue();
  // the point at which we will consider the queue "full"
  userWork.limit = _.keys(route.resolve).length;

  const resolve = {
    __prep__: function ($injector) {
      return $injector.invoke(setup.doWork, setup, { userWork });
    }
  };

  // send each user resolve to the userWork queue, which will prevent it from running before the
  // prep is complete
  _.forOwn(route.resolve || {}, function (expr, name) {
    resolve[name] = function ($injector, Promise) {
      const defer = Promise.defer();
      userWork.push(defer);
      return defer.promise.then(function () {
        return $injector[angular.isString(expr) ? 'get' : 'invoke'](expr);
      });
    };
  });

  // we're copied everything over so now overwrite
  route.resolve = resolve;
}

