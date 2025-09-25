/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelativeTime } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type { SessionState } from './session_timeout';
import type { StartServices } from '..';
import { SESSION_GRACE_PERIOD_MS } from '../../common/constants';

export interface SessionExpirationModalProps {
  sessionState$: Observable<SessionState>;
  onExtend: () => Promise<any>;
  onClose: () => void;
}

export const SessionExpirationModal: FunctionComponent<SessionExpirationModalProps> = ({
  sessionState$,
  onExtend,
  onClose,
}) => {
  const state = useObservable(sessionState$);
  const [{ loading }, extend] = useAsyncFn(onExtend);

  if (!state || !state.expiresInMs) {
    return null;
  }

  const timeoutSeconds = Math.max(state.expiresInMs - SESSION_GRACE_PERIOD_MS, 0) / 1000;

  return (
    <EuiModal
      onClose={onClose}
      initialFocus="[data-test-subj=session-expiration-extend-button]"
      role="dialog"
      aria-labelledby="session-expiration-modal-title"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id="session-expiration-modal-title">
          <EuiIcon type="clock" color="warning" size="l" style={{ marginRight: 8 }} />
          {i18n.translate('xpack.security.sessionExpirationModal.title', {
            defaultMessage: 'Session timeout',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <FormattedMessage
          id="xpack.security.sessionExpirationModal.body"
          defaultMessage="You will be logged out {timeout}. Please save your work and log in again."
          values={{
            timeout: <FormattedRelativeTime value={timeoutSeconds} updateIntervalInSeconds={1} />,
          }}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiButton
            color="primary"
            isLoading={loading}
            onClick={extend}
            data-test-subj="session-expiration-extend-button"
            autoFocus
          >
            <FormattedMessage
              id="xpack.security.sessionExpirationModal.extendButton"
              defaultMessage="Stay logged in"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const createSessionExpirationModal = (
  services: StartServices,
  sessionState$: Observable<SessionState>,
  onExtend: () => Promise<any>,
  onClose: () => void
) => {
  return toMountPoint(
    <SessionExpirationModal sessionState$={sessionState$} onExtend={onExtend} onClose={onClose} />,
    services
  );
};
