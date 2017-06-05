import _ from 'lodash';
import { uiModules } from 'ui/modules';

const module = uiModules.get('kibana');

// Provides a tiny subset of the excelent API from
// bluebird, reimplemented using the $q service
module.service('Promise', function ($q, $timeout) {
  function Promise(fn) {
    if (typeof this === 'undefined') throw new Error('Promise constructor must be called with "new"');

    const defer = $q.defer();
    try {
      fn(defer.resolve, defer.reject);
    } catch (e) {
      defer.reject(e);
    }
    return defer.promise;
  }

  Promise.all = Promise.props = $q.all;
  Promise.resolve = function (val) {
    const defer = $q.defer();
    defer.resolve(val);
    return defer.promise;
  };
  Promise.reject = function (reason) {
    const defer = $q.defer();
    defer.reject(reason);
    return defer.promise;
  };
  Promise.cast = $q.when;
  Promise.defer = $q.defer;
  Promise.delay = function (ms) {
    return $timeout(_.noop, ms);
  };
  Promise.method = function (fn) {
    return function () {
      const args = Array.prototype.slice.call(arguments);
      return Promise.try(fn, args, this);
    };
  };
  Promise.nodeify = function (promise, cb) {
    promise.then(function (val) {
      cb(void 0, val);
    }, cb);
  };
  Promise.map = function (arr, fn) {
    return Promise.all(arr.map(function (i, el, list) {
      return Promise.try(fn, [i, el, list]);
    }));
  };
  Promise.each = function (arr, fn) {
    const queue = arr.slice(0);
    let i = 0;
    return (function next() {
      if (!queue.length) return arr;
      return Promise.try(fn, [arr.shift(), i++]).then(next);
    }());
  };
  Promise.is = function (obj) {
    // $q doesn't create instances of any constructor, promises are just objects with a then function
    // https://github.com/angular/angular.js/blob/58f5da86645990ef984353418cd1ed83213b111e/src/ng/q.js#L335
    return obj && typeof obj.then === 'function';
  };
  Promise.halt = _.once(function () {
    const promise = new Promise();
    promise.then = _.constant(promise);
    promise.catch = _.constant(promise);
    return promise;
  });
  Promise.try = function (fn, args, ctx) {
    if (typeof fn !== 'function') {
      return Promise.reject(new TypeError('fn must be a function'));
    }

    let value;

    if (_.isArray(args)) {
      try { value = fn.apply(ctx, args); }
      catch (e) { return Promise.reject(e); }
    } else {
      try { value = fn.call(ctx, args); }
      catch (e) { return Promise.reject(e); }
    }

    return Promise.resolve(value);
  };
  Promise.fromNode = function (takesCbFn) {
    return new Promise(function (resolve, reject) {
      takesCbFn(function (err, ...results) {
        if (err) reject(err);
        else if (results.length > 1) resolve(results);
        else resolve(results[0]);
      });
    });
  };
  Promise.race = function (iterable) {
    return new Promise((resolve, reject) => {
      for (const i of iterable) {
        Promise.resolve(i).then(resolve, reject);
      }
    });
  };

  return Promise;
});

module.factory('PromiseEmitter', function (Promise) {
  /**
   * Create a function that uses an "event" like pattern for promises.
   *
   * When a single argument is passed, this will behave just like calling `new Promise(fn)`,
   * but when a second arguemnt is passed, the fn will be used to recreate a promise eveytime
   * the previous is resolved. The following example demonstrates what this allows:
   *
   * When using `new Promise()` to create a promise, you can allow consumers to be
   * notified of a single change:
   * ```
   * obj.onUpdate= function() {
   *   // NOTE: we are NOT using `new Promise.emitter()` here
   *   return new Promise(function (resolve, reject) {
   *     // wait for the update...
   *     resolve();
   *   });
   * }
   * ```
   *
   * And the consumer can ask for continual updates be re-invoking the `.onChange()` method
   * every time a change occurs:
   * ```
   * obj.onChange().then(function useChanges(change) {
   *   // use changes...
   *   // then register to receive notifcation of the next change
   *   obj.onChange().then(useChanges);
   * });
   * ```
   *
   * But by defining obj.onChange using `new Promise.emitter`:
   * ```
   * obj.onChange = function (handler) {
   *   return new Promise.emitter(function (resolve, reject) {
   *     // wait for changes...
   *     resolve();
   *   });
   * };
   * ```
   *
   * The consumer can now simplify their code by passing the handler directly to `.onUpdate()`
   * and the boilerplate of recalling `.onUpdate()` will be handled for them.
   * ```
   * obj.onChanges(function useChanges(changes) {
   *   // use changes...
   * });
   * ```
   *
   * @param  {Function} fn - Used to init the promise, and call either
   *                       reject or resolve (passed as args)
   * @param  {Function} handler - A function that will be called every
   *                            time this promise is resolved
   *
   * @return {Promise}
   */
  function PromiseEmitter(fn, handler) {
    const prom = new Promise(fn);

    if (!handler) return prom;

    return prom.then(handler).then(function recurse() {
      return new PromiseEmitter(fn, handler);
    });
  }

  return PromiseEmitter;
});
