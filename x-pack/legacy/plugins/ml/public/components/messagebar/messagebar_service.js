/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { toastNotifications } from 'ui/notify';
import { MLRequestFailure } from '../../util/ml_error';
import { i18n } from '@kbn/i18n';

const messages = [];


const MSG_STYLE = { INFO: 'ml-message-info', WARNING: 'ml-message-warning', ERROR: 'ml-message-error' };

function getMessages() {
  return messages;
}

function addMessage(msg) {
  if (messages.find(m => (m.text === msg.text && m.style === msg.style)) === undefined) {
    messages.push(msg);
  }
}

function removeMessage(index) {
  messages.splice(index, 1);
}

function clear() {
  messages.length = 0;
}

function info(text) {
  addMessage({ text, style: MSG_STYLE.INFO });
}

function warning(text) {
  addMessage({ text, style: MSG_STYLE.WARNING });
}

function error(text, resp) {
  text = `${text} ${expandErrorMessageObj(resp)}`;
  addMessage({ text, style: MSG_STYLE.ERROR });
}

function expandErrorMessageObj(resp) {
  let txt = '';
  if (resp !== undefined && typeof resp === 'object') {
    try {
      const respObj = JSON.parse(resp.response);
      if (typeof respObj === 'object' && respObj.error !== undefined) {
        txt = respObj.error.reason;
      }
    } catch(e) {
      txt = resp.message;
    }
  }
  return txt;
}

function errorNotify(text, resp) {
  let err = null;
  if (typeof text === 'object' && text.response !== undefined) {
    resp = text.response;
  } else if (typeof text === 'object' && text.message !== undefined) {
    err = new Error(text.message);
  } else {
    err = new Error(text);
  }

  toastNotifications.addError(new MLRequestFailure(err, resp), {
    title: i18n.translate('xpack.ml.messagebarService.errorTitle', {
      defaultMessage: 'An error has ocurred',
    })
  });
}

export const mlMessageBarService = {
  getMessages,
  addMessage,
  removeMessage,
  clear,
  info,
  warning,
  error,
  notify: {
    error: errorNotify
  }
};
