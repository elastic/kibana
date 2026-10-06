/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, SecurityServiceStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { TaskInstance, TaskUserScope } from '../task';
import type { GrantApiKeysOpts } from '../api_key_strategy/api_key_strategy';
export interface APIKeyResult {
  id: string;
  api_key: string;
}
export interface EncodedApiKeyResult {
  apiKey: string;
  apiKeyId: string;
}
export interface ApiKeyAndUserScope {
  apiKey: string;
  userScope: TaskUserScope;
}
export interface RequestApiKeyCredentials {
  /** Key id; absent for user-created Cloud (UIAM) API keys, which are raw `essu_` secrets. */
  id?: string;
  api_key?: string;
}
/**
 * Splits the `base64(<id>:<secret>)` envelope that Elasticsearch API keys — and
 * UIAM-provisioned keys — are persisted in. This is the only place that decoding lives.
 *
 * For a value that is not in that shape (e.g. a raw `essu_…` secret) `secret` is absent and
 * `id` is meaningless, so every caller has to validate what it gets back before using it.
 */
export declare const decodeStoredApiKey: (storedApiKey: string) => {
  id: string;
  secret?: string;
};
/**
 * Normalizes a stored task `uiamApiKey` into the credential UIAM expects on the wire.
 *
 * Two writers persist this attribute in different shapes:
 * - the grant path (`EsAndUiamApiKeyStrategy.grantApiKeys`) stores the raw `essu_…` secret;
 * - the UIAM provisioning (convert) path stores `base64(<id>:<secret>)`, mirroring how ES API
 *   keys are encoded.
 *
 * Only the raw secret authenticates. Presenting the base64 envelope makes Elasticsearch parse it
 * as a native `id:api_key` pair and look the id up in its own key store, which fails with a
 * generic authentication error without the cloud realm — and therefore UIAM — ever being reached.
 * A value in neither shape is returned untouched, so behavior for it is unchanged.
 */
export declare const getUiamApiKeySecret: (storedUiamApiKey: string) => string;
/**
 * Extracts the UIAM key id from a stored `uiamApiKey`, the counterpart to
 * {@link getUiamApiKeySecret}.
 *
 * Only the `base64(<id>:<secret>)` shape carries an id. User-created Cloud keys are stored as
 * the raw `essu_…` secret and have no id, so `undefined` for them is the correct answer rather
 * than a gap: nothing in Kibana owns — or may invalidate — those keys.
 */
export declare const getUiamApiKeyId: (storedUiamApiKey?: string | null) => string | undefined;
export declare const isRequestApiKeyType: (user: AuthenticatedUser | null) => boolean;
export declare const hasApiKey: (user: AuthenticatedUser | null, request: KibanaRequest) => boolean;
export declare const requestHasApiKey: (
  security: SecurityServiceStart,
  request: KibanaRequest
) => boolean;
export declare const getApiKeyFromRequest: (
  request: KibanaRequest
) => RequestApiKeyCredentials | null;
export declare const shouldCloneApiKeyFromRequest: (
  security: SecurityServiceStart,
  request: KibanaRequest,
  options?: GrantApiKeysOpts,
  user?: AuthenticatedUser | null
) => boolean;
export declare const createApiKey: (
  taskInstances: TaskInstance[],
  request: KibanaRequest,
  security: SecurityServiceStart,
  options?: GrantApiKeysOpts,
  preResolved?: {
    user: AuthenticatedUser | null;
    apiKeyCreatedByUser: boolean;
  }
) => Promise<Map<string, EncodedApiKeyResult>>;
export declare const getApiKeyAndUserScope: (
  taskInstances: TaskInstance[],
  request: KibanaRequest,
  security: SecurityServiceStart,
  options?: GrantApiKeysOpts
) => Promise<Map<string, ApiKeyAndUserScope>>;
