/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SessionError, SessionErrorReason } from './session_error';

export class SessionMissingError extends SessionError {
  constructor() {
    super(SessionErrorReason.SESSION_MISSING, SessionErrorReason.SESSION_MISSING);
  }
}
