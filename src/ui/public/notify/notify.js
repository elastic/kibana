/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { uiModules } from '../modules';
import { fatalError } from './fatal_error';
import { Notifier } from './notifier';
import { metadata } from '../metadata';
import template from './partials/toaster.html';
import './notify.less';
import '../filters/markdown';
import '../directives/truncated';

const module = uiModules.get('kibana/notify');

module.directive('kbnNotifications', function () {
  return {
    restrict: 'E',
    scope: {
      list: '=list'
    },
    replace: true,
    template
  };
});

export const notify = new Notifier();

module.factory('createNotifier', function () {
  return function (opts) {
    return new Notifier(opts);
  };
});

module.factory('Notifier', function () {
  return Notifier;
});

// teach Notifier how to use angular interval services
module.run(function (config, $interval, $compile) {
  Notifier.applyConfig({
    setInterval: $interval,
    clearInterval: $interval.cancel
  });
  applyConfig(config);
  Notifier.$compile = $compile;
});

// if kibana is not included then the notify service can't
// expect access to config (since it's dependent on kibana)
if (!!metadata.kbnIndex) {
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

  const banner = config.get('notifications:banner');

  if (typeof banner === 'string' && banner.trim()) {
    notify.banner(banner, 'notifications:banner');
  }
}

window.onerror = function (err, url, line) {
  fatalError(new Error(`${err} (${url}:${line})`));
  return true;
};

if (window.addEventListener) {
  const notifier = new Notifier({
    location: 'Promise'
  });

  window.addEventListener('unhandledrejection', function (e) {
    notifier.log(`Detected an unhandled Promise rejection.\n${e.reason}`);
  });
}

