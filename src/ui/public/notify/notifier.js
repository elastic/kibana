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

const consoleGroups = ('group' in window.console) && ('groupCollapsed' in window.console) && ('groupEnd' in window.console);

const log = _.bindKey(console, 'log');

function now() {
  if (window.performance && window.performance.now) {
    return window.performance.now();
  }
  return Date.now();
}

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
  warning: 'kuiButton--warning',
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
  warning: `alert-warning`,
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
    'event',
    'lifecycle',
    'timed',
    'error',
    'warning',
  ];

  notificationLevels.forEach(function (m) {
    self[m] = _.bind(self[m], self);
  });
}

Notifier.config = {
  bannerLifetime: 3000000,
  errorLifetime: 300000,
  warningLifetime: 10000,
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

/**
 * Log a sometimes redundant event
 * @param {string} name - The name of the group
 * @param {boolean} success - Simple flag stating whether the event succeeded
 */
Notifier.prototype.event = createGroupLogger('event', {
  open: true
});

/**
 * Log a major, important, event in the lifecycle of the application
 * @param {string} name - The name of the lifecycle event
 * @param {boolean} success - Simple flag stating whether the lifecycle event succeeded
 */
Notifier.prototype.lifecycle = createGroupLogger('lifecycle', {
  open: true
});

/**
 * Wrap a function so that it's execution time gets logged.
 *
 * @param {function} fn - the function to wrap, it's .name property is
 *                      read so make sure to set it
 * @return {function} - the wrapped function
 */
Notifier.prototype.timed = function (name, fn) {
  const self = this;

  if (typeof name === 'function') {
    fn = name;
    name = fn.name;
  }

  return function WrappedNotifierFunction() {
    const cntx = this;
    const args = arguments;

    return self.event(name, function () {
      return fn.apply(cntx, args);
    });
  };
};

const overrideableOptions = ['lifetime', 'icon'];

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
  }, _.pick(opts, overrideableOptions));
  return add(config, cb);
};

/**
 * Warn the user abort something
 * @param  {String} msg
 * @param  {Function} cb
 */
Notifier.prototype.warning = function (msg, opts, cb) {
  if (_.isFunction(opts)) {
    cb = opts;
    opts = {};
  }

  const config = _.assign({
    type: 'warning',
    content: formatMsg(msg, this.from),
    icon: 'warning',
    title: 'Warning',
    lifetime: Notifier.config.warningLifetime,
    actions: ['accept']
  }, _.pick(opts, overrideableOptions));
  return add(config, cb);
};

/**
 * Display a banner message
 * @param  {String} msg
 * @param  {Function} cb
 */
let bannerId;
let bannerTimeoutId;
Notifier.prototype.banner = function (content = '') {
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
      <div dangerouslySetInnerHTML={{ __html: markdownIt.render(content) }} />

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
      case 'warning':
        return Notifier.config.warningLifetime;
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
 * Display a custom message
 * @param  {String} msg - required
 * @param  {Object} config - required
 * @param  {Function} cb - optional
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
Notifier.prototype.custom = function (msg, config, cb) {
  const customConfig = getDecoratedCustomConfig(config);
  customConfig.content = formatMsg(msg, this.from);
  return add(customConfig, cb);
};

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

Notifier.prototype.describeError = formatMsg.describeError;

if (log === _.noop) {
  Notifier.prototype.log = _.noop;
} else {
  Notifier.prototype.log = function () {
    const args = [].slice.apply(arguments);
    if (this.from) args.unshift(this.from + ':');
    log.apply(null, args);
  };
}

// general functionality used by .event() and .lifecycle()
function createGroupLogger(type, opts) {
  // Track the groups managed by this logger
  const groups = window[type + 'Groups'] = {};

  return function logger(name, success) {
    let status; // status of the timer
    let exec; // function to execute and wrap
    let ret; // return value

    const complete = function (val) { logger(name, true); return val; };
    const failure = function (err) { logger(name, false); throw err; };

    if (typeof success === 'function' || success === void 0) {
      // start
      groups[name] = now();
      if (success) {
        // success === the function to time
        exec = success;
      } else {
        // function that can report on the success or failure of an op, and pass their value along
        ret = complete;
        ret.failure = failure;
      }
    }
    else {
      groups[name] = now() - (groups[name] || 0);
      const time = ' in ' + groups[name].toFixed(2) + 'ms';

      // end
      if (success) {
        status = 'complete' + time;
      } else {
        groups[name] = false;
        status = 'failure' + time;
      }
    }

    if (consoleGroups) {
      if (status) {
        console.log(status); // eslint-disable-line no-console
        console.groupEnd(); // eslint-disable-line no-console
      } else {
        if (opts.open) {
          console.group(name); // eslint-disable-line no-console
        } else {
          console.groupCollapsed(name); // eslint-disable-line no-console
        }
      }
    } else {
      log('KBN: ' + name + (status ? ' - ' + status : ''));
    }

    if (exec) {
      try {
        ret = exec();
      } catch (e) {
        return failure(e);
      }

      if (ret && typeof ret.then === 'function') {
        // return a new promise that proxies the value
        // and logs about the promise outcome
        return ret.then(function (val) {
          complete();
          return val;
        }, function (err) {
          failure(err);
          throw err;
        });
      }

      // the function executed fine, and didn't return a promise, move along
      complete();
    }

    return ret;
  };
}

