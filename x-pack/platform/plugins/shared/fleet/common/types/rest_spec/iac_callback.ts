/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CloudConnectorCallback,
  CloudConnectorCallbackIdentity,
  IacCallbackReceivedValues,
  IacCallbackStatus,
} from '../models/iac_callback';

/**
 * Whether a launched stack could report back to this Kibana. `kibana_url` is `server.publicBaseUrl`
 * as the stack is given it; `reason` says why the callback cannot be used.
 */
export interface GetIacCallbackAvailabilityResponse {
  available: boolean;
  kibana_url?: string;
  reason?: string;
}

export interface CreateIacCallbackRequest {
  body: CloudConnectorCallbackIdentity & {
    provider: 'aws';
  };
}

export interface CreateIacCallbackResponse {
  item: CloudConnectorCallback;
  /** Base64 `id:api_key`, returned exactly once. Passed to the stack as a parameter; never persisted. */
  api_key: string;
}

export interface GetIacCallbackRequest {
  params: { callbackId: string };
}

export interface GetIacCallbackResponse {
  item: CloudConnectorCallback;
}

export interface DeleteIacCallbackRequest {
  params: { callbackId: string };
}

/** The record as left by the cancel: `cancelled`, or untouched when the stack had already reported. */
export interface DeleteIacCallbackResponse {
  item: CloudConnectorCallback;
}

export interface ReceiveIacCallbackRequest {
  params: { callbackId: string };
  body: IacCallbackReceivedValues;
}

export interface ReceiveIacCallbackResponse {
  status: IacCallbackStatus;
}
