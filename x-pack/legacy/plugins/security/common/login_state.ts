/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type LoginLayout = 'form' | 'error-es-unavailable' | 'error-xpack-unavailable';

export interface LoginState {
  layout: LoginLayout;
  allowLogin: boolean;
}
