/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CloudConnectorCallback,
  CloudConnectorCallbackIdentity,
  CloudConnectorCallbackReceivedValues,
  ProvisioningCallbackStatus,
} from '../models/provisioning_callback';

/**
 * Whether a launched stack could report back to this Kibana. `kibana_url` is `server.publicBaseUrl`
 * as the stack is given it; `reason` says why the callback cannot be used.
 */
export interface GetProvisioningCallbackAvailabilityResponse {
  available: boolean;
  kibana_url?: string;
  reason?: string;
}

export interface CreateProvisioningCallbackRequest {
  body: CloudConnectorCallbackIdentity & {
    provider: 'aws';
  };
}

export interface CreateProvisioningCallbackResponse {
  item: CloudConnectorCallback;
  /** The record's token, returned exactly once. Passed to the stack as a parameter; only its hash is kept. */
  token: string;
}

export interface GetProvisioningCallbackRequest {
  params: { callbackId: string };
}

export interface GetProvisioningCallbackResponse {
  item: CloudConnectorCallback;
}

export interface DeleteProvisioningCallbackRequest {
  params: { callbackId: string };
}

/** The record as left by the cancel: `cancelled`, or untouched when the stack had already reported. */
export interface DeleteProvisioningCallbackResponse {
  item: CloudConnectorCallback;
}

export interface ReceiveProvisioningCallbackRequest {
  params: { callbackId: string };
  body: CloudConnectorCallbackReceivedValues;
}

export interface ReceiveProvisioningCallbackResponse {
  status: ProvisioningCallbackStatus;
}
