import { uiModules } from 'ui/modules';
import { Promise } from 'bluebird';

const module = uiModules.get('kibana');

// Provides a tiny subset of the excellent API from
// bluebird, reimplemented using the $q service
module.service('Promise', function () {
  /**
   * Unfortunately the old Promise.map we manually wrote for $q was not a perfect equivalent to bluebirds built in
   * Promise.map.  Seems to be that this version is more synchronous than bluebirds, so that you don't always need
   * await.
   * TODO: For each situation that relies on this special version of map, convert to the original, and get tests
   * working.
   *
   * @param arr
   * @param fn
   * @return {Promise.<*>}
   */
  Promise.map = function (arr, fn) {
    return Promise.all(arr.map(function (i, el, list) {
      return Promise.try(fn, [i, el, list]);
    }));
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
