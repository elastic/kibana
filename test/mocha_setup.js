const sinon = require('sinon');
const autoRelease = require('auto-release-sinon');

require('../src/optimize/babel/register');

// hook into the global afterEach variable to allow autoReleaseSinon to register
// an afterEach handler before mocha has exposed itself to the test files.
//
// This works by telling autoReleaseSinon to use a fake "afterEach" function.
// Rather than actually record an afterEach handler the function tracks all of
// the calls it received and queues them up in queuedAfterEachArgs.
//
// The global "afterEach" variable is also tracked, and once it is assigned by mocha
// the variable global is reconfigured to point directly to the new value (from mocha)
// and all of the queued invocations are executed.
const queuedAfterEachArgs = [];
Object.defineProperty(global, 'afterEach', {
  configurable: true,
  get() { return undefined; },
  set(afterEach) {
    Object.defineProperty(global, 'afterEach', {
      configurable: true,
      writable: true,
      value: afterEach
    });

    queuedAfterEachArgs.forEach(function (args) {
      afterEach.apply(null, args);
    });

    return global.afterEach;
  }
});

autoRelease.setupAutoRelease(sinon, function () {
  if (!global.afterEach) {
    queuedAfterEachArgs.push(Array.prototype.slice.call(arguments));
  } else {
    global.afterEach.apply(this, arguments);
  }
});
