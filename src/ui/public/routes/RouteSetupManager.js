let _ = require('lodash');

module.exports = class RouteSetupManager {
  constructor() {
    this.setupWork = [];
    this.onSetupComplete = [];
    this.onSetupError = [];
    this.onWorkComplete = [];
    this.onWorkError = [];
  }

  addSetupWork(fn) {
    this.setupWork.push(fn);
  }

  afterSetupWork(onComplete, onError) {
    this.onSetupComplete.push(onComplete);
    this.onSetupError.push(onError);
  }

  afterWork(onComplete, onError) {
    this.onWorkComplete.push(onComplete);
    this.onWorkError.push(onError);
  }

  /**
   * Do each setupWork function by injecting it with angular dependencies
   * and accepting promises from it.
   * @return {[type]} [description]
   */
  doWork(Promise, $injector, userWork) {

    let invokeEach = (arr, locals) => {
      return Promise.map(arr, fn => {
        if (!fn) return;
        return $injector.invoke(fn, null, locals);
      });
    };

    // call each error handler in order, until one of them resolves
    // or we run out of handlers
    let callErrorHandlers = (handlers, origError) => {
      if (!_.size(handlers)) throw origError;

      // clone so we don't discard handlers or loose them
      handlers = handlers.slice(0);

      let next = (err) => {
        if (!handlers.length) throw err;

        let handler = handlers.shift();
        if (!handler) return next(err);

        return Promise.try(function () {
          return $injector.invoke(handler, null, { err });
        }).catch(next);
      };

      return next(origError);
    };

    return invokeEach(this.setupWork)
    .then(
      () => invokeEach(this.onSetupComplete),
      err => callErrorHandlers(this.onSetupError, err)
    )
    .then(() => {
      // wait for the queue to fill up, then do all the work
      let defer = Promise.defer();
      userWork.resolveWhenFull(defer);

      return defer.promise.then(() => Promise.all(userWork.doWork()));
    })
    .then(
      () => invokeEach(this.onWorkComplete),
      err => callErrorHandlers(this.onWorkError, err)
    );
  }
};
