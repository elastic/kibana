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

import React from 'react';
import _ from 'lodash';
import angular from 'angular';
import MarkdownIt from 'markdown-it';
import { metadata } from '../metadata';
import { formatMsg, formatStack } from './lib';
import { fatalError } from './fatal_error';
import { banners } from './banners';
import '../render_directive';

import {
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';

const notifs = [];

const {
  version,
  buildNum,
} = metadata;

function closeNotif(notif, cb = _.noop, key) {
  return function () {
    // this === notif
    const i = notifs.indexOf(notif);
    if (i !== -1) notifs.splice(i, 1);

    cancelTimer(notif);
    cb(key);
  };
}

function cancelTimer(notif) {
  if (notif.timerId) {
    Notifier.config.clearInterval(notif.timerId);
    notif.timerId = undefined;
  }
}

function timerCanceler(notif, cb = _.noop, key) {
  return function cancelNotifTimer() {
    cancelTimer(notif);
    cb(key);
  };
}

/**
 * Initiates a timer to update _timeRemaining_ on the notif at second
 * intervals and clears the notif once the notif _lifetime_ has been reached.
 */
function startNotifTimer(notif, cb) {
  const interval = 1000;

  if (notif.lifetime === Infinity || notif.lifetime === 0) {
    return;
  }

  notif.timeRemaining = Math.floor(notif.lifetime / interval);

  notif.timerId = Notifier.config.setInterval(function () {
    notif.timeRemaining -= 1;

    if (notif.timeRemaining <= 0) {
      closeNotif(notif, cb, 'ignore')();
    }
  }, interval, notif.timeRemaining);

  notif.cancelTimer = timerCanceler(notif, cb);
}

function restartNotifTimer(notif, cb) {
  cancelTimer(notif);
  startNotifTimer(notif, cb);
}

const typeToButtonClassMap = {
  danger: 'kuiButton--danger', // NOTE: `error` type is internally named as `danger`
  info: 'kuiButton--primary',
};
const buttonHierarchyClass = (index) => {
  if (index === 0) {
    // first action: primary className
    return 'kuiButton--primary';
  }
  // subsequent actions: secondary/default className
  return 'kuiButton--basic';
};
const typeToAlertClassMap = {
  danger: `alert-danger`,
  info: `alert-info`,
};

function add(notif, cb) {
  _.set(notif, 'info.version', version);
  _.set(notif, 'info.buildNum', buildNum);

  notif.clear = closeNotif(notif);

  if (notif.actions) {
    notif.actions.forEach(function (action) {
      notif[action] = closeNotif(notif, cb, action);
    });
  } else if (notif.customActions) {
    // wrap all of the custom functions in a close
    notif.customActions = notif.customActions.map((action, index) => {
      return {
        key: action.text,
        dataTestSubj: action.dataTestSubj,
        callback: closeNotif(notif, action.callback, action.text),
        getButtonClass() {
          const buttonTypeClass = typeToButtonClassMap[notif.type];
          return `${buttonHierarchyClass(index)} ${buttonTypeClass}`;
        }
      };
    });
  }

  notif.count = (notif.count || 0) + 1;

  notif.isTimed = function isTimed() {
    return notif.timerId ? true : false;
  };

  // decorate the notification with helper functions for the template
  notif.getButtonClass = () => typeToButtonClassMap[notif.type];
  notif.getAlertClassStack = () => `toast-stack alert ${typeToAlertClassMap[notif.type]}`;
  notif.getIconClass = () => `fa fa-${notif.icon}`;
  notif.getToastMessageClass = ()  => 'toast-message';
  notif.getAlertClass = () => `toast alert ${typeToAlertClassMap[notif.type]}`;
  notif.getButtonGroupClass = () => 'toast-controls';

  let dup = null;
  if (notif.content) {
    dup = _.find(notifs, function (item) {
      return item.content === notif.content && item.lifetime === notif.lifetime;
    });
  }

  if (dup) {
    dup.count += 1;
    dup.stacks = _.union(dup.stacks, [notif.stack]);

    restartNotifTimer(dup, cb);

    return dup;
  }

  startNotifTimer(notif, cb);

  notif.stacks = [notif.stack];
  notifs.push(notif);
  return notif;
}

Notifier.prototype.add = add;

/**
 * Functionality to check that
 */
export function Notifier(opts) {
  const self = this;
  opts = opts || {};

  // label type thing to say where notifications came from
  self.from = opts.location;

  const notificationLevels = [
    'error',
  ];

  notificationLevels.forEach(function (m) {
    self[m] = _.bind(self[m], self);
  });
}

Notifier.config = {
  bannerLifetime: 3000000,
  errorLifetime: 300000,
  infoLifetime: 5000,
  setInterval: window.setInterval,
  clearInterval: window.clearInterval
};

Notifier.applyConfig = function (config) {
  _.merge(Notifier.config, config);
};

// "Constants"
Notifier.QS_PARAM_MESSAGE = 'notif_msg';
Notifier.QS_PARAM_LEVEL = 'notif_lvl';
Notifier.QS_PARAM_LOCATION = 'notif_loc';

Notifier.pullMessageFromUrl = ($location) => {
  const queryString = $location.search();
  if (!queryString.notif_msg) {
    return;
  }
  const message = queryString[Notifier.QS_PARAM_MESSAGE];
  const config = queryString[Notifier.QS_PARAM_LOCATION] ? { location: queryString[Notifier.QS_PARAM_LOCATION] } : {};
  const level = queryString[Notifier.QS_PARAM_LEVEL] || 'info';

  $location.search(Notifier.QS_PARAM_MESSAGE, null);
  $location.search(Notifier.QS_PARAM_LOCATION, null);
  $location.search(Notifier.QS_PARAM_LEVEL, null);

  const notifier = new Notifier(config);

  if (level === 'fatal') {
    fatalError(message);
  } else {
    notifier[level](message);
  }
};

// simply a pointer to the global notif list
Notifier.prototype._notifs = notifs;

const overridableOptions = ['lifetime', 'icon'];

/**
 * Alert the user of an error that occured
 * @param  {Error|String} err
 * @param  {Function} cb
 */
Notifier.prototype.error = function (err, opts, cb) {
  if (_.isFunction(opts)) {
    cb = opts;
    opts = {};
  }

  const config = _.assign({
    type: 'danger',
    content: formatMsg(err, this.from),
    icon: 'warning',
    title: 'Error',
    lifetime: Notifier.config.errorLifetime,
    actions: ['report', 'accept'],
    stack: formatStack(err)
  }, _.pick(opts, overridableOptions));
  return add(config, cb);
};

/**
 * Display a banner message
 * @param  {String} content
 * @param  {String} name
 */
let bannerId;
let bannerTimeoutId;
Notifier.prototype.banner = function (content = '', name = '') {
  const BANNER_PRIORITY = 100;

  const dismissBanner = () => {
    banners.remove(bannerId);
    clearTimeout(bannerTimeoutId);
  };

  const markdownIt = new MarkdownIt({
    html: false,
    linkify: true
  });

  const banner = (
    <EuiCallOut
      title="Attention"
      iconType="help"
    >
      <div
        /*
         * Justification for dangerouslySetInnerHTML:
         * The notifier relies on `markdown-it` to produce safe and correct HTML.
         */
        dangerouslySetInnerHTML={{ __html: markdownIt.render(content) }} //eslint-disable-line react/no-danger
        data-test-subj={name ? `banner-${name}` : null}
      />

      <EuiButton type="primary" size="s" onClick={dismissBanner}>
        Dismiss
      </EuiButton>
    </EuiCallOut>
  );

  bannerId = banners.set({
    component: banner,
    id: bannerId,
    priority: BANNER_PRIORITY,
  });

  clearTimeout(bannerTimeoutId);
  bannerTimeoutId = setTimeout(() => {
    dismissBanner();
  }, Notifier.config.bannerLifetime);
};

/**
 * Helper for common behavior in custom and directive types
 */
function getDecoratedCustomConfig(config) {
  // There is no helper condition that will allow for 2 parameters, as the
  // other methods have. So check that config is an object
  if (!_.isPlainObject(config)) {
    throw new Error('Config param is required, and must be an object');
  }

  // workaround to allow callers to send `config.type` as `error` instead of
  // reveal internal implementation that error notifications use a `danger`
  // style
  if (config.type === 'error') {
    config.type = 'danger';
  }

  const getLifetime = (type) => {
    switch (type) {
      case 'danger':
        return Notifier.config.errorLifetime;
      default: // info
        return Notifier.config.infoLifetime;
    }
  };

  const customConfig = _.assign({
    type: 'info',
    title: 'Notification',
    lifetime: getLifetime(config.type)
  }, config);

  const hasActions = _.get(customConfig, 'actions.length');
  if (hasActions) {
    customConfig.customActions = customConfig.actions;
    delete customConfig.actions;
  } else {
    customConfig.actions = ['accept'];
  }

  return customConfig;
}

/**
 * Display a scope-bound directive using template rendering in the message area
 * @param  {Object} directive - required
 * @param  {Object} config - required
 * @param  {Function} cb - optional
 *
 * directive = {
 *  template: `<p>Hello World! <a ng-click="example.clickHandler()">Click me</a>.`,
 *  controllerAs: 'example',
 *  controller() {
 *    this.clickHandler = () {
 *      // do something
 *    };
 *  }
 * }
 *
 * config = {
 *   title: 'Some Title here',
 *   type: 'info',
 *   actions: [{
 *     text: 'next',
 *     callback: function() { next(); }
 *   }, {
 *     text: 'prev',
 *     callback: function() { prev(); }
 *   }]
 * }
 */
Notifier.prototype.directive = function (directive, config, cb) {
  if (!_.isPlainObject(directive)) {
    throw new Error('Directive param is required, and must be an object');
  }
  if (!Notifier.$compile) {
    throw new Error('Unable to use the directive notification until Angular has initialized.');
  }
  if (directive.scope) {
    throw new Error('Directive should not have a scope definition. Notifier has an internal implementation.');
  }
  if (directive.link) {
    throw new Error('Directive should not have a link function. Notifier has an internal link function helper.');
  }

  // make a local copy of the directive param (helps unit tests)
  const localDirective = _.clone(directive, true);

  localDirective.scope = { notif: '=' };
  localDirective.link = function link($scope, $el) {
    const $template = angular.element($scope.notif.directive.template);
    const postLinkFunction = Notifier.$compile($template);
    $el.html($template);
    postLinkFunction($scope);
  };

  const customConfig = getDecoratedCustomConfig(config);
  customConfig.directive = localDirective;
  return add(customConfig, cb);
};
