/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type FleetErrorType = 'verification_failed' | 'package_assets_verification_failed';

/**
 * Categories for Elastic Package Registry (EPR) connection failures, derived from
 * the underlying Node system error code (e.g. `ENOTFOUND` -> `dns`).
 */
export type RegistryConnectionErrorType = 'timeout' | 'dns' | 'connection' | 'unknown';

/**
 * Categories for all EPR errors: connection-level failures plus `http` for 4xx/5xx
 * responses returned by the registry.
 */
export type RegistryErrorType = RegistryConnectionErrorType | 'http';

export interface FleetErrorResponse {
  message: string;
  statusCode: number;
  attributes?: {
    type?: FleetErrorType | RegistryErrorType;
    /** Underlying failure reason, e.g. a Node error code (`ETIMEDOUT`) or an HTTP status code. */
    reason?: string;
    missing_assets?: Array<{ id: string; type: string }>;
  };
}
