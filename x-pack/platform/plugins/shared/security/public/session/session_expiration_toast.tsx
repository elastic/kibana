/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import type { ToastInput } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelativeTime } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type { SessionState } from './session_timeout';
import type { StartServices } from '..';
import { SESSION_GRACE_PERIOD_MS } from '../../common/constants';

export interface SessionExpirationToastProps {
  sessionState$: Observable<SessionState>;
}

export const SessionExpirationToast: FunctionComponent<SessionExpirationToastProps> = ({
  sessionState$,
}) => {
  const state = useObservable(sessionState$);

  if (!state || !state.expiresInMs) {
    return null;
  }

  const timeoutSeconds = Math.max(state.expiresInMs - SESSION_GRACE_PERIOD_MS, 0) / 1000;

  const expirationWarning = (
    <FormattedMessage
      id="xpack.security.sessionExpirationToast.body"
      defaultMessage="You will be logged out {timeout}. Please save your work and log in again."
      values={{
        timeout: <FormattedRelativeTime value={timeoutSeconds} updateIntervalInSeconds={1} />,
      }}
    />
  );

  return expirationWarning;
};

export const createSessionExpirationToast = (
  services: StartServices,
  sessionState$: Observable<SessionState>,
  onClose: () => void
): ToastInput => {
  return {
    color: 'warning',
    iconType: 'clock',
    title: i18n.translate('xpack.security.sessionExpirationToast.title', {
      defaultMessage: 'Session timeout',
    }),
    text: toMountPoint(<SessionExpirationToast sessionState$={sessionState$} />, services),
    onClose,
    toastLifeTimeMs: 0x7fffffff, // Toast is hidden based on observable so using maximum possible timeout
  };
};
