/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type FleetErrorType = 'verification_failed' | 'package_assets_verification_failed';

export interface FleetErrorResponse {
  message: string;
  statusCode: number;
  attributes?: {
    type?: FleetErrorType;
    missing_assets?: Array<{ id: string; type: string }>;
  };
}
