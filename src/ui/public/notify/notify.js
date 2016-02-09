import _ from 'lodash';
import $ from 'jquery';
import modules from 'ui/modules';
import errors from 'ui/notify/errors';
import Notifier from 'ui/notify/notifier';
import 'ui/notify/directives';
var module = modules.get('kibana/notify');
var rootNotifier = new Notifier();


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

export default rootNotifier;

