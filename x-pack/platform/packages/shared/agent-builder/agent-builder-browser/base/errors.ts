/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspect } from 'util';
import { i18n } from '@kbn/i18n';

const PAYLOAD_TOO_LARGE_STATUS = 413;

const payloadTooLargeMessage = i18n.translate('xpack.agentBuilder.errors.payloadTooLarge', {
  defaultMessage: 'The request is too large to send. Reduce its size and try again.',
});

// The status of a failed HTTP request, if the error carries a response (e.g. an `HttpFetchError`)
const getHttpStatus = (error: any): number | undefined => {
  const status = error?.response?.status;
  return typeof status === 'number' ? status : undefined;
};

/*
 * Produce a string version of an error,
 */
export function formatAgentBuilderErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (!error) {
    // stringify undefined/null/whatever this falsy value is
    return inspect(error);
  }

  const httpStatus = getHttpStatus(error);

  // the server rejects oversized bodies before they reach the route, with a message that is not meant for users;
  // this is shared by every caller, so the wording must not assume what was being sent
  if (httpStatus === PAYLOAD_TOO_LARGE_STATUS) {
    return payloadTooLargeMessage;
  }

  // handle http response errors with error messages
  if (error.body && typeof error.body.message === 'string') {
    return error.body.message;
  }

  // handle standard error objects with messages, keeping the status of failed HTTP requests visible
  if (error instanceof Error && error.message) {
    return httpStatus === undefined
      ? error.message
      : i18n.translate('xpack.agentBuilder.errors.httpErrorWithStatus', {
          defaultMessage: '{message} (HTTP {status})',
          values: { message: error.message, status: httpStatus },
        });
  }

  // the status text can be empty (e.g. over HTTP/2), leaving the status as the only thing to show
  if (httpStatus !== undefined) {
    return i18n.translate('xpack.agentBuilder.errors.httpStatusOnly', {
      defaultMessage: 'Request failed (HTTP {status})',
      values: { status: httpStatus },
    });
  }

  // everything else can just be serialized using util.inspect()
  return inspect(error);
}
