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

module.run(function ($interval, $rootScope, config) {
  var configInitListener = $rootScope.$on('init:config', function () {
    applyConfig();
    configInitListener();
  });

  $rootScope.$on('change:config', applyConfig);

  Notifier.applyConfig({
    setInterval: $interval,
    clearInterval: $interval.cancel
  });

  function applyConfig() {
    Notifier.applyConfig({
      errorLifetime: config.get('notifications:lifetime:error'),
      warningLifetime: config.get('notifications:lifetime:warning'),
      infoLifetime: config.get('notifications:lifetime:info')
    });
  }
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
