/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IacCallback,
  IacCallbackIdentity,
  IacCallbackReceivedValues,
  IacCallbackStatus,
} from '../models/iac_callback';

export interface CreateIacCallbackRequest {
  body: IacCallbackIdentity & {
    provider: 'aws';
  };
}

export interface CreateIacCallbackResponse {
  item: IacCallback;
  /** Base64 `id:api_key`, returned exactly once. Passed to the stack as a parameter; never persisted. */
  api_key: string;
}

export interface GetIacCallbackRequest {
  params: { callbackId: string };
}

export interface GetIacCallbackResponse {
  item: IacCallback;
}

export interface DeleteIacCallbackRequest {
  params: { callbackId: string };
}

/** The record as left by the cancel: `cancelled`, or untouched when the stack had already reported. */
export interface DeleteIacCallbackResponse {
  item: IacCallback;
}

export interface ReceiveIacCallbackRequest {
  params: { callbackId: string };
  body: IacCallbackReceivedValues;
}

export interface ReceiveIacCallbackResponse {
  status: IacCallbackStatus;
}
