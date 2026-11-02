/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { ApiKeyInvalidationTarget } from '../invalidate/get_api_key_invalidation_targets';

export interface ScopedEsApiKey {
  id: string;
  secret: string;
  name?: string;
}

export interface ScopedUiamApiKey {
  /** Absent for a user-created Cloud API key, which is a raw `essu_` secret. */
  id?: string;
  secret: string;
  name?: string;
}

/** The credentials resolved for one consumer object, before it maps them onto its own storage. */
export interface ScopedCredentials {
  es?: ScopedEsApiKey;
  uiam?: ScopedUiamApiKey;
  /** The caller's own key was reused. User-created keys are never invalidated. */
  createdByUser: boolean;
  /** UIAM's verdict that the reused UIAM key is external. Only set with a user-created UIAM key. */
  uiamExternal?: true;
}

export interface ScopedApiKeyNames {
  es: string;
  uiam: string;
}

export type ScopedApiKeysMode = 'auto' | 'grant' | 'clone' | 'reuse';

export interface ScopedApiKeysDeps {
  security: SecurityServiceStart;
  logger: Logger;
}

export interface ResolveScopedApiKeysOpts {
  /** One key set per entry. Granted and cloned keys are minted once per entry. */
  names: ReadonlyMap<string, ScopedApiKeyNames>;
  /**
   * `auto` decides from the request: a UIAM service account gets a UIAM key; an API key request
   * is cloned when `clone` is set or it is a fake request, and reused otherwise; anything else is
   * granted. The other modes force that outcome.
   */
  mode?: ScopedApiKeysMode;
  clone?: boolean;
  /** `single` resolves one key per entry (UIAM when enabled, else ES); `pair` resolves both. */
  storage?: 'pair' | 'single';
  /** Whether UIAM keys may be granted or reused. Each consumer computes this from its own config. */
  uiamEnabled: boolean;
  /** Whether a failed UIAM grant fails the whole resolution instead of being logged and skipped. */
  uiamRequired?: boolean;
  refresh?: boolean | 'wait_for';
  /** Metadata for granted and cloned Elasticsearch API keys. */
  metadata: Record<string, unknown>;
  /** Called as soon as a key is minted, so callers can queue it for invalidation if a later step fails. */
  onKeyCreated?: (target: ApiKeyInvalidationTarget) => void;
  logTags?: { credentials?: string[]; grant?: string[] };
}

export type ResolveScopedApiKeysResult =
  | { enabled: false }
  | { enabled: true; credentials: Map<string, ScopedCredentials> };
