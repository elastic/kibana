/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { ToastInputFields } from '@kbn/core/public';
import { formatMsg } from '../lib/format_msg';
import { coreServices } from './kibana_services';

const getToast = (err: Error | string, opts: ToastInputFields = {}) => {
  const errData = (get(err, 'response') || err) as Error | string;
  const errBody = get(err, 'body', undefined);
  const errMsg = formatMsg(errBody !== undefined ? err : errData);
  const { title, ...rest } = opts;
  let text;

  if (title) {
    text = errMsg;
  }

  return {
    ...rest,
    title: title || errMsg,
    text,
  };
};

export interface CanvasNotifyService {
  error: (err: string | Error, opts?: ToastInputFields) => void;
  warning: (err: string | Error, opts?: ToastInputFields) => void;
  info: (err: string | Error, opts?: ToastInputFields) => void;
  success: (err: string | Error, opts?: ToastInputFields) => void;
}

export const getCanvasNotifyService = (): CanvasNotifyService => {
  const toasts = coreServices.notifications.toasts;

  return {
    /*
     * @param {(string | Object)} err: message or Error object
     * @param {Object} opts: option to override toast title or icon, see https://github.com/elastic/eui/blob/main/packages/eui/src/components/toast/toast.tsx#L26
     */
    error(err, opts) {
      toasts.addDanger(getToast(err, opts));
    },
    warning(err, opts) {
      toasts.addWarning(getToast(err, opts));
    },
    info(err, opts) {
      toasts.add(getToast(err, opts));
    },
    success(err, opts) {
      toasts.addSuccess(getToast(err, opts));
    },
  };
};
