/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { GrantAPIKeyResult, SecurityServiceStart } from '@kbn/core-security-server';
import type { UiamLogTags } from '../log_tags';

/**
 * - `optional`: a failed UIAM grant is logged and the ES key is still created.
 * - `required`: a failed UIAM grant fails the whole call.
 * - `only`: when UIAM is enabled, grant only a UIAM key, failing if it can't be granted. When
 *   UIAM is disabled, grant only an ES key.
 *
 * In `optional` and `required` mode, requests without UIAM credentials never get a UIAM key.
 */
export type UiamMode = 'optional' | 'required' | 'only';

/** How a plugin creates API keys. Declared once, when the plugin builds its client. */
export interface ApiKeysProfile {
  /** Added to UIAM log tags, e.g. `alerting`. */
  pluginTag: string;
  uiam: UiamMode;
  /** Reuse the caller's own API key as-is. When false, the caller's key is cloned instead. */
  reuse: boolean;
  /** Metadata of every key the plugin grants or clones. */
  metadata: Record<string, unknown>;
  /** Log level for a grant request without UIAM credentials. Defaults to `error`. */
  missingUiamCredentialsLogLevel?: 'error' | 'debug';
}

export interface CreateOptions {
  name: string;
  /** Name of the UIAM key. Defaults to `uiam-<name>`. */
  uiamName?: string;
  /** Names what the key is for in errors and logs, e.g. `alerting rule : my-rule`. */
  subject: string;
  refresh?: boolean | 'wait_for';
  /** Create only an Elasticsearch key for this call, as if UIAM were disabled. */
  esOnly?: boolean;
  /**
   * Called as soon as each key is created, before the next grant runs, so the caller can queue
   * keys a later failure leaves behind (for example, when a UIAM rollback fails).
   */
  onKeyCreated?: (type: 'es' | 'uiam', key: GrantAPIKeyResult) => void;
}

export interface ResolveOptions extends CreateOptions {
  /** The caller's API key is borrowed, so clone it instead of reusing it. */
  clone?: boolean;
}

export interface ClientContext {
  security: SecurityServiceStart;
  logger: Logger;
  profile: ApiKeysProfile;
  tags: UiamLogTags;
  uiamEnabled: boolean;
}
