define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var modules = require('ui/modules');
  var module = modules.get('kibana/notify');
  var errors = require('ui/notify/errors');
  var Notifier = require('ui/notify/Notifier');
  var rootNotifier = new Notifier();

  require('ui/notify/directives');

  module.factory('createNotifier', function () {
    return function (opts) {
      return new Notifier(opts);
    };
  });

  module.factory('Notifier', function () {
    return Notifier;
  });

  module.run(function ($timeout) {
    // provide alternate methods for setting timeouts, which will properly trigger digest cycles
    Notifier.setTimerFns($timeout, $timeout.cancel);
  });

  /**
   * Global Angular exception handler (NOT JUST UNCAUGHT EXCEPTIONS)
   */
  // modules
  //   .get('exceptionOverride')
  //   .factory('$exceptionHandler', function () {
  //     return function (exception, cause) {
  //       rootNotifier.fatal(exception, cause);
  //     };
  //   });

  window.onerror = function (err, url, line) {
    rootNotifier.fatal(new Error(err + ' (' + url + ':' + line + ')'));
    return true;
  };

  return rootNotifier;

});
