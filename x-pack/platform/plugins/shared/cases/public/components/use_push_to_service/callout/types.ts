/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ErrorMessage {
  description: JSX.Element | string;
  errorType?: 'primary' | 'success' | 'warning' | 'danger';
  id: string;
  title: string;
}

export const CLOSED_CASE_PUSH_ERROR_ID = 'closed-case-push-error';
