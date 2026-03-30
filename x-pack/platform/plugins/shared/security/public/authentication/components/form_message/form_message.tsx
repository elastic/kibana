/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';

import { i18n } from '@kbn/i18n';

import type { LogoutReason } from '../../../../common/types';

export enum MessageType {
  None,
  Info,
  Danger,
}

export interface FormMessage {
  type: MessageType;
  content?: string;
}

export const formMessages: Record<LogoutReason, FormMessage> = {
  SESSION_EXPIRED: {
    type: MessageType.Info,
    content: i18n.translate('xpack.security.login.sessionExpiredDescription', {
      defaultMessage: 'Your session has timed out. Please log in again.',
    }),
  },
  CONCURRENCY_LIMIT: {
    type: MessageType.Info,
    content: i18n.translate('xpack.security.login.concurrencyLimitDescription', {
      defaultMessage: 'You have logged in on another device. Please log in again.',
    }),
  },
  AUTHENTICATION_ERROR: {
    type: MessageType.Info,
    content: i18n.translate('xpack.security.login.authenticationErrorDescription', {
      defaultMessage: 'An unexpected authentication error occurred. Please log in again.',
    }),
  },
  LOGGED_OUT: {
    type: MessageType.Info,
    content: i18n.translate('xpack.security.login.loggedOutDescription', {
      defaultMessage: 'You have logged out of Elastic.',
    }),
  },
  UNAUTHENTICATED: {
    type: MessageType.Danger,
    content: i18n.translate('xpack.security.unauthenticated.errorDescription', {
      defaultMessage:
        'Try logging in again, and if the problem persists, contact your system administrator.',
    }),
  },
};

export function renderMessage(message: FormMessage) {
  if (message.type === MessageType.None || !message.content) {
    return null;
  }

  if (message.type === MessageType.Danger) {
    return (
      <Fragment>
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          data-test-subj="loginErrorMessage"
          title={message.content}
          role="alert"
        />
        <EuiSpacer size="l" />
      </Fragment>
    );
  }

  if (message.type === MessageType.Info) {
    return (
      <Fragment>
        <EuiCallOut
          announceOnMount
          size="s"
          color="primary"
          data-test-subj="loginInfoMessage"
          title={message.content}
          role="status"
        />
        <EuiSpacer size="l" />
      </Fragment>
    );
  }

  return null;
}
