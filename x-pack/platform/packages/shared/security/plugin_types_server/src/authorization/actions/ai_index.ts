/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds the Elasticsearch application privilege actions (prefixed with `ai_index:`) that gate read
 * access to AI Index (`ai-index-*`) catalogue entries.
 *
 * These actions are granted to a role whenever a feature privilege opts into AI Index access via
 * `aiIndex: { read: ['<kiType>'] }` (see `FeaturePrivilegeAiIndexBuilder`).
 *
 * Scope: this only covers read access to catalogue entries in the AI Index. It deliberately does NOT
 * reuse the `saved_object:*` actions — those belong to saved-objects authz, and AI Index visibility
 * must not be coupled to another subsystem's action names.
 */
export interface AiIndexActions {
  /**
   * Returns the `ai_index:<kiType>/read` action, granting read access to AI Index catalogue entries
   * of that KI type. Read is currently the only operation supported.
   */
  read(kiType: string): string;
}
