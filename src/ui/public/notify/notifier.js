import _ from 'lodash';
import $ from 'jquery';
import metadata from 'ui/metadata';
import formatMsg from 'ui/notify/lib/_format_msg';
import fatalSplashScreen from 'ui/notify/partials/fatal_splash_screen.html';
/* eslint no-console: 0 */

let notifs = [];
let version = metadata.version;
let buildNum = metadata.buildNum;
let consoleGroups = ('group' in window.console) && ('groupCollapsed' in window.console) && ('groupEnd' in window.console);

let log = _.bindKey(console, 'log');

// used to identify the first call to fatal, set to false there
let firstFatal = true;

let fatalToastTemplate = (function lazyTemplate(tmpl) {
  let compiled;
  return function (vars) {
    return (compiled || (compiled = _.template(tmpl)))(vars);
  };
}(require('ui/notify/partials/fatal.html')));

function now() {
  if (window.performance && window.performance.now) {
    return window.performance.now();
  }
  return Date.now();
}

function closeNotif(notif, cb = _.noop, key) {
  return function () {
    // this === notif
    let i = notifs.indexOf(notif);
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

  if (notif.lifetime === Infinity) {
    return;
  }

  notif.timeRemaining = Math.floor(notif.lifetime / interval);

  notif.timerId = Notifier.config.setInterval(function () {
    notif.timeRemaining -= 1;

    if (notif.timeRemaining === 0) {
      closeNotif(notif, cb, 'ignore')();
    }
  }, interval, notif.timeRemaining);

  notif.cancelTimer = timerCanceler(notif, cb);
}

function restartNotifTimer(notif, cb) {
  cancelTimer(notif);
  startNotifTimer(notif, cb);
}

function add(notif, cb) {
  _.set(notif, 'info.version', version);
  _.set(notif, 'info.buildNum', buildNum);

  notif.clear = closeNotif(notif);

  if (notif.actions) {
    notif.actions.forEach(function (action) {
      notif[action] = closeNotif(notif, cb, action);
    });
  }

  notif.count = (notif.count || 0) + 1;

  notif.isTimed = function isTimed() {
    return notif.timerId ? true : false;
  };

  let dup = _.find(notifs, function (item) {
    return item.content === notif.content && item.lifetime === notif.lifetime;
  });

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

function set(opts, cb) {
  if (this._sovereignNotif) {
    this._sovereignNotif.clear();
  }
  if (!opts.content && !opts.markdown) {
    return null;
  }
  this._sovereignNotif = add(opts, cb);
  return this._sovereignNotif;
}

Notifier.prototype.add = add;
Notifier.prototype.set = set;

function formatInfo() {
  let info = [];

  if (!_.isUndefined(version)) {
    info.push(`Version: ${version}`);
  }

  if (!_.isUndefined(buildNum)) {
    info.push(`Build: ${buildNum}`);
  }

  return info.join('\n');
}

// browsers format Error.stack differently; always include message
function formatStack(err) {
  if (err.stack && !~err.stack.indexOf(err.message)) {
    return 'Error: ' + err.message + '\n' + err.stack;
  }
  return err.stack;
}

/**
 * Functionality to check that
 */
function Notifier(opts) {
  let self = this;
  opts = opts || {};

  // label type thing to say where notifications came from
  self.from = opts.location;

  'event lifecycle timed fatal error warning info banner'.split(' ').forEach(function (m) {
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

// to be notified when the first fatal error occurs, push a function into this array.
Notifier.fatalCallbacks = [];

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
  notifier[level](message);
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
  let self = this;

  if (typeof name === 'function') {
    fn = name;
    name = fn.name;
  }

  return function WrappedNotifierFunction() {
    let cntx = this;
    let args = arguments;

    return self.event(name, function () {
      return fn.apply(cntx, args);
    });
  };
};

/**
 * Kill the page, display an error, then throw the error.
 * Used as a last-resort error back in many promise chains
 * so it rethrows the error that's displayed on the page.
 *
 * @param  {Error} err - The error that occured
 */
Notifier.prototype.fatal = function (err) {
  this._showFatal(err);
  throw err;
};

/**
 * Display an error that destroys the entire app. Broken out so that
 * global error handlers can display fatal errors without throwing another
 * error like in #fatal()
 *
 * @param  {Error} err - The fatal error that occured
 */
Notifier.prototype._showFatal = function (err) {
  if (firstFatal) {
    _.callEach(Notifier.fatalCallbacks);
    firstFatal = false;
    window.addEventListener('hashchange', function () {
      window.location.reload();
    });
  }

  let html = fatalToastTemplate({
    info: formatInfo(),
    msg: formatMsg(err, this.from),
    stack: formatStack(err)
  });

  let $container = $('#fatal-splash-screen');

  if (!$container.size()) {
    $(document.body)
      // in case the app has not completed boot
    .removeAttr('ng-cloak')
    .html(fatalSplashScreen);

    $container = $('#fatal-splash-screen');
  }

  $container.append(html);
  console.error(err.stack);
};

/**
 * Alert the user of an error that occured
 * @param  {Error|String} err
 * @param  {Function} cb
 */
Notifier.prototype.error = function (err, cb) {
  return add({
    type: 'danger',
    content: formatMsg(err, this.from),
    icon: 'warning',
    title: 'Error',
    lifetime: Notifier.config.errorLifetime,
    actions: ['report', 'accept'],
    stack: formatStack(err)
  }, cb);
};

/**
 * Warn the user abort something
 * @param  {String} msg
 * @param  {Function} cb
 */
Notifier.prototype.warning = function (msg, cb) {
  return add({
    type: 'warning',
    content: formatMsg(msg, this.from),
    icon: 'warning',
    title: 'Warning',
    lifetime: Notifier.config.warningLifetime,
    actions: ['accept']
  }, cb);
};

/**
 * Display a debug message
 * @param  {String} msg
 * @param  {Function} cb
 */
Notifier.prototype.info = function (msg, cb) {
  return add({
    type: 'info',
    content: formatMsg(msg, this.from),
    icon: 'info-circle',
    title: 'Debug',
    lifetime: Notifier.config.infoLifetime,
    actions: ['accept']
  }, cb);
};

/**
 * Display a banner message
 * @param  {String} msg
 * @param  {Function} cb
 */
Notifier.prototype.banner = function (msg, cb) {
  return this.set({
    type: 'banner',
    title: 'Attention',
    markdown: formatMsg(msg, this.from),
    lifetime: Notifier.config.bannerLifetime,
    actions: ['accept']
  }, cb);
};

Notifier.prototype.describeError = formatMsg.describeError;

if (log === _.noop) {
  Notifier.prototype.log = _.noop;
} else {
  Notifier.prototype.log = function () {
    let args = [].slice.apply(arguments);
    if (this.from) args.unshift(this.from + ':');
    log.apply(null, args);
  };
}

// general functionality used by .event() and .lifecycle()
function createGroupLogger(type, opts) {
  // Track the groups managed by this logger
  let groups = window[type + 'Groups'] = {};

  return function logger(name, success) {
    let status; // status of the timer
    let exec; // function to execute and wrap
    let ret; // return value

    let complete = function (val) { logger(name, true); return val; };
    let failure = function (err) { logger(name, false); throw err; };

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
      let time = ' in ' + groups[name].toFixed(2) + 'ms';

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
        console.log(status);
        console.groupEnd();
      } else {
        if (opts.open) {
          console.group(name);
        } else {
          console.groupCollapsed(name);
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

export default Notifier;
