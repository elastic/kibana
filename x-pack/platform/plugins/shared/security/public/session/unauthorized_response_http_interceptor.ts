/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HttpInterceptor,
  HttpInterceptorResponseError,
  IAnonymousPaths,
  IHttpInterceptController,
} from '@kbn/core/public';

import type { SessionExpired } from './session_expired';
import { SESSION_ERROR_REASON_HEADER } from '../../common/constants';
import { LogoutReason } from '../../common/types';

export class UnauthorizedResponseHttpInterceptor implements HttpInterceptor {
  constructor(private sessionExpired: SessionExpired, private anonymousPaths: IAnonymousPaths) {}

  responseError(
    httpErrorResponse: HttpInterceptorResponseError,
    controller: IHttpInterceptController
  ) {
    if (this.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }

    // if the request was omitting credentials it's to an anonymous endpoint
    // (for example to login) and we don't wish to ever redirect
    if (httpErrorResponse.request.credentials === 'omit') {
      return;
    }

    // if we happen to not have a response, for example if there is no
    // network connectivity, we don't do anything
    const { response } = httpErrorResponse;
    if (!response) {
      return;
    }

    if (response.status === 401) {
      const reason = response.headers.get(SESSION_ERROR_REASON_HEADER);
      this.sessionExpired.logout(
        reason === LogoutReason.SESSION_EXPIRED || reason === LogoutReason.CONCURRENCY_LIMIT
          ? reason
          : LogoutReason.AUTHENTICATION_ERROR
      );
      controller.halt();
    }
  }
}
