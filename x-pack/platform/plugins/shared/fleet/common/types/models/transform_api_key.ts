/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrantAPIKeyResult } from '@kbn/security-plugin/server';

export interface TransformAPIKey extends GrantAPIKeyResult {
  /**
   * Generated encoded API key used for headers
   */
  encoded: string;
}

export interface SecondaryAuthorizationHeader {
  headers?: { 'es-secondary-authorization': string | string[] };
}
