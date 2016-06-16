import _ from 'lodash';
import $ from 'jquery';
import modules from 'ui/modules';
import errors from 'ui/notify/errors';
import Notifier from 'ui/notify/notifier';
import 'ui/notify/directives';
import chrome from 'ui/chrome';
import { kbnIndex } from 'ui/metadata';
let module = modules.get('kibana/notify');
let rootNotifier = new Notifier();

module.factory('createNotifier', function () {
  return function (opts) {
    return new Notifier(opts);
  };
});

module.factory('Notifier', function () {
  return Notifier;
});

// teach Notifier how to use angular interval services
module.run(function (config, $interval) {
  Notifier.applyConfig({
    setInterval: $interval,
    clearInterval: $interval.cancel
  });
  applyConfig(config);
});

// if kibana is not included then the notify service can't
// expect access to config (since it's dependent on kibana)
if (!!kbnIndex) {
  require('ui/config');
  module.run(function (config) {
    config.watchAll(() => applyConfig(config));
  });
}

function applyConfig(config) {
  Notifier.applyConfig({
    bannerLifetime: config.get('notifications:lifetime:banner'),
    errorLifetime: config.get('notifications:lifetime:error'),
    warningLifetime: config.get('notifications:lifetime:warning'),
    infoLifetime: config.get('notifications:lifetime:info')
  });
  rootNotifier.banner(config.get('notifications:banner'));
}

window.onerror = function (err, url, line) {
  rootNotifier.fatal(new Error(err + ' (' + url + ':' + line + ')'));
  return true;
};

if (window.addEventListener) {
  const notify = new Notifier({
    location: 'Promise'
  });

  window.addEventListener('unhandledrejection', function (e) {
    notify.log(`Detected an unhandled Promise rejection.\n${e.reason}`);
  });
}

export default rootNotifier;
