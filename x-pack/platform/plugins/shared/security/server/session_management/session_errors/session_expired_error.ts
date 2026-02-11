/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SessionError, SessionErrorReason } from './session_error';

export class SessionExpiredError extends SessionError {
  constructor(
    reason:
      | SessionErrorReason.SESSION_EXPIRED
      | SessionErrorReason.SESSION_IDLE_TIMEOUT
      | SessionErrorReason.SESSION_LIFESPAN_TIMEOUT = SessionErrorReason.SESSION_EXPIRED
  ) {
    super(reason, reason);
  }
}
