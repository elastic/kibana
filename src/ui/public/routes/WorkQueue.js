define(function (require) {
  let _ = require('lodash');

  function WorkQueue() {
    let q = this;

    let work = [];
    let fullDefers = [];

    q.limit = 0;
    Object.defineProperty(q, 'length', {
      get: function () {
        return work.length;
      }
    });

    let resolve = function (defers) {
      return defers.splice(0).map(function (defer) {
        return defer.resolve();
      });
    };

    let checkIfFull = function () {
      if (work.length >= q.limit && fullDefers.length) {
        resolve(fullDefers);
      }
    };

    q.resolveWhenFull = function (defer) {
      fullDefers.push(defer);
      checkIfFull();
    };

    q.doWork = function () {
      let resps = resolve(work);
      checkIfFull();
      return resps;
    };

    q.empty = function () {
      work.splice(0);
      checkIfFull();
    };

    q.push = function (defer) {
      work.push(defer);
      checkIfFull();
    };
  }

  return WorkQueue;
});
