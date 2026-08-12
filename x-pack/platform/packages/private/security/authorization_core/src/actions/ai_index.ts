/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import type { AiIndexActions as AiIndexActionsType } from '@kbn/security-plugin-types-server';

/**
 * Builds the Elasticsearch application privilege actions (prefixed with `ai_index:`) that gate read
 * access to AI Index (`ai-index-*`) catalogue entries.
 *
 * These actions are granted to a role whenever a feature privilege opts into AI Index access via
 * `aiIndex: { read: ['<kiType>'] }` (see `FeaturePrivilegeAiIndexBuilder`).
 */
export class AiIndexActions implements AiIndexActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `ai_index:`;
  }

  /**
   * Returns the `ai_index:<kiType>/read` action. The KI type is embedded in the action so a role
   * that can read dashboards in the catalogue does not implicitly gain read on other entry types.
   *
   * Ordering follows the convention every slash-delimited Kibana action namespace already uses —
   * subject first, operation last: `saved_object:<type>/<operation>`, `cases:<owner>/<operation>`,
   * `alerting:<ruleTypeId>/<consumer>/<entity>/<operation>`.
   *
   * `|` is rejected because the SML indexer joins the space id and this action with `|` to form the
   * document-level-security label, and the search path splits on the first `|`. That guard is the one
   * deliberate addition over `SavedObjectActions.get`, which validates non-emptiness only.
   */
  public read(kiType: string): string {
    if (!kiType || !isString(kiType)) {
      throw new Error('kiType is required and must be a string');
    }
    if (kiType.includes('|')) {
      throw new Error(`kiType may not contain '|'`);
    }
    return `${this.prefix}${kiType}/read`;
  }
}
