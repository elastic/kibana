var sinon = require('sinon');
var autoRelease = require('auto-release-sinon');

require('babel/register')(require('../src/optimize/babelOptions').node);

var queuedAfterEachArgs = [];
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
