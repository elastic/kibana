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
    //
    // `request` is typed as always-defined, but `interceptResponse` (packages/core-http-browser-internal)
    // can legitimately call `responseError` with `request: undefined` -- e.g. when the rejection
    // reaching the *first* interceptor in the chain isn't an `HttpFetchError` carrying its own
    // `.request` (and there's no prior interceptor's resolved response to fall back to either).
    // Guard rather than throw: an unhandled `TypeError` here crashes this request's whole
    // response-interception chain, which can leave whatever awaited it (e.g. a dashboard panel's
    // search) stuck without ever reaching its own error/complete state.
    if (httpErrorResponse.request?.credentials === 'omit') {
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
      const sessionExpiredReasons: LogoutReason[] = [
        LogoutReason.SESSION_EXPIRED,
        LogoutReason.SESSION_IDLE_TIMEOUT,
        LogoutReason.SESSION_LIFESPAN_TIMEOUT,
      ];
      const isSessionExpiredReason = sessionExpiredReasons.includes(reason! as LogoutReason);
      const isConcurrencyLimitReason = reason === LogoutReason.CONCURRENCY_LIMIT;
      this.sessionExpired.logout(
        isSessionExpiredReason || isConcurrencyLimitReason
          ? (reason as LogoutReason)
          : LogoutReason.AUTHENTICATION_ERROR
      );
      controller.halt();
    }
  }
}
