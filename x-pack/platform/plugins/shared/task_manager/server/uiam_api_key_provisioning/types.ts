/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Success result from UIAM convert API */
export interface UiamConvertSuccessResult {
  status: 'success';
  id: string;
  key: string;
  organization_id: string;
  description: string;
  internal: boolean;
  role_assignments: Record<string, unknown>;
  creation_date: string;
}

/** Failed result from UIAM convert API */
export interface UiamConvertFailedResult {
  status: 'failed';
  message: string;
  type: string;
  resource: string;
  code: string;
}

/** Response from core.security.authc.apiKeys.uiam.convert */
export interface UiamConvertResponse {
  results: Array<UiamConvertSuccessResult | UiamConvertFailedResult>;
}

/** Params for core.security.authc.apiKeys.uiam.convert */
export interface UiamConvertParams {
  keys: Array<{ key: string; type: 'elasticsearch' }>;
}
