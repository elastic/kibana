function WorkQueue() {
  const q = this;

  const work = [];
  const fullDefers = [];

  q.limit = 0;
  Object.defineProperty(q, 'length', {
    get: function () {
      return work.length;
    }
  });

  const resolve = function (defers) {
    return defers.splice(0).map(function (defer) {
      return defer.resolve();
    });
  };

  const checkIfFull = function () {
    if (work.length >= q.limit && fullDefers.length) {
      resolve(fullDefers);
    }
  };

  q.resolveWhenFull = function (defer) {
    fullDefers.push(defer);
    checkIfFull();
  };

  q.doWork = function () {
    const resps = resolve(work);
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

export default WorkQueue;
