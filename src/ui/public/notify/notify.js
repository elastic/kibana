define(function (require) {
  let _ = require('lodash');
  let $ = require('jquery');
  let modules = require('ui/modules');
  let module = modules.get('kibana/notify');
  let errors = require('ui/notify/errors');
  let Notifier = require('ui/notify/notifier');
  let rootNotifier = new Notifier();

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
