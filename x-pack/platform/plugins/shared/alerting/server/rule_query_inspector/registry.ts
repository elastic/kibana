/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleQueryInspectorHandler } from './types';

export class RuleQueryInspectorRegistry {
  private readonly handlers = new Map<string, RuleQueryInspectorHandler>();

  register(ruleTypeId: string, handler: RuleQueryInspectorHandler): void {
    if (this.handlers.has(ruleTypeId)) {
      throw new Error(
        `Rule query inspector handler for rule type "${ruleTypeId}" is already registered`
      );
    }
    this.handlers.set(ruleTypeId, handler);
  }

  get(ruleTypeId: string): RuleQueryInspectorHandler | undefined {
    return this.handlers.get(ruleTypeId);
  }
}
