/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { contains } from 'lodash';
import { toastNotifications } from 'ui/notify';
// @ts-ignore
import { formatMsg } from 'ui/notify/lib';
import {
  EuiButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

type ErrorType = {
  status?: number,
  data?: { message: string },
} & string

const invalidError = (err: ErrorType) => (!err || typeof err !== 'object');

const statusError = (status?: number | string) => {
  return (
    <EuiText size="xs">
      <FormattedMessage
        id="xpack.monitoring.ajaxErrorHandler.httpErrorMessage"
        defaultMessage="HTTP {errStatus}"
        values={{ errStatus: status || '(unknown error)' }}
      />
    </EuiText>
  )
};

const showUnknownError = (err?: ErrorType | undefined) => {
  toastNotifications.addDanger({
    title: (
      <FormattedMessage
        id="xpack.monitoring.ajaxErrorHandler.requestErrorNotificationTitle"
        defaultMessage="Monitoring Request Error"
      />),
    text: statusError(err && err.status)
  });
};

export const formatError = (err: ErrorType) => {
  if (invalidError(err)) {
    showUnknownError(err);
    return formatMsg(err);
  }
  if (err.status! > 0 && err.data) {
    return (
      <EuiText>
        <p>
          {err.data.message}
        </p>
        {statusError(err.status)}
      </EuiText>
    );
  }

  return formatMsg(err);
}

export const ajaxErrorHandler = (err: ErrorType) => {
  if (invalidError(err)) {
    showUnknownError(err);
    return Promise.reject(formatMsg(err));
  }
  if (err.status === 403) {
    //TODO: redirect to 'access-denied' page
  } else if (err.status === 404 && !contains(window.location.hash, 'no-data')) {
    toastNotifications.addDanger({
      title: (
        <FormattedMessage
          id="xpack.monitoring.ajaxErrorHandler.requestFailedNotificationTitle"
          defaultMessage="Monitoring Request Failed"
        />),
      text: (
        <div>
          {formatError(err)}
          <EuiSpacer />
          <EuiButton
            size="s"
            color="danger"
            onClick={() => window.location.reload()}
          >
            <FormattedMessage
              id="xpack.monitoring.ajaxErrorHandler.requestFailedNotification.retryButtonLabel"
              defaultMessage="Retry"
            />
          </EuiButton>
        </div>
      )
    });
  } else {
    toastNotifications.addDanger({
      title: (
        <FormattedMessage
          id="xpack.monitoring.ajaxErrorHandler.requestErrorNotificationTitle"
          defaultMessage="Monitoring Request Error"
        />),
      text: formatError(err)
    });
  }

  return Promise.reject(err);

}
