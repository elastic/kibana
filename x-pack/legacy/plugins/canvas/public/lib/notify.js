/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getCoreStart, getStartPlugins } from '../legacy';

const getToastNotifications = function() {
  return getCoreStart().notifications.toasts;
};

const formatMsg = function(...args) {
  return getStartPlugins().__LEGACY.formatMsg(...args);
};

const getToast = (err, opts = {}) => {
  const errData = get(err, 'response') || err;
  const errMsg = formatMsg(errData);
  const { title, ...rest } = opts;
  let text = null;

  if (title) {
    text = errMsg;
  }

  return {
    ...rest,
    title: title || errMsg,
    text,
  };
};

export const notify = {
  /*
   * @param {(string | Object)} err: message or Error object
   * @param {Object} opts: option to override toast title or icon, see https://github.com/elastic/kibana/blob/master/src/legacy/ui/public/notify/toasts/TOAST_NOTIFICATIONS.md
   */
  error(err, opts) {
    getToastNotifications().addDanger(getToast(err, opts));
  },
  warning(err, opts) {
    getToastNotifications().addWarning(getToast(err, opts));
  },
  info(err, opts) {
    getToastNotifications().add(getToast(err, opts));
  },
  success(err, opts) {
    getToastNotifications().addSuccess(getToast(err, opts));
  },
};
