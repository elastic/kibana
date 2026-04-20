/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { CreateRuleBody, IRulesManagementClient, UpdateRuleBody } from './rules_management_client';

/**
 * Routes writes to the primary client only, but sends deletes to both primary and legacy.
 *
 * Used while the alerting v2 flag is ON to clean up pre-existing v1 rules whenever a query
 * is removed or its ES|QL changes (breaking change → delete + recreate). Once all legacy
 * rules are gone the legacy adapter becomes a no-op. Errors from the legacy adapter are
 * logged and swallowed so a missing legacy rule never blocks the primary operation.
 */
export class DualCleanupRulesAdapter implements IRulesManagementClient {
  constructor(
    private readonly primary: IRulesManagementClient,
    private readonly legacy: IRulesManagementClient,
    private readonly logger: Logger
  ) {}

  createRule(id: string, body: CreateRuleBody): Promise<void> {
    return this.primary.createRule(id, body);
  }

  updateRule(id: string, body: UpdateRuleBody): Promise<void> {
    return this.primary.updateRule(id, body);
  }

  async bulkDeleteRules(ids: string[]): Promise<void> {
    const [primaryResult, legacyResult] = await Promise.allSettled([
      this.primary.bulkDeleteRules(ids),
      this.legacy.bulkDeleteRules(ids),
    ]);

    if (legacyResult.status === 'rejected') {
      this.logger.warn(
        `Legacy rule cleanup failed for ${ids.length} rule(s) — orphaned v1 rules may continue running: ${
          legacyResult.reason instanceof Error
            ? legacyResult.reason.message
            : String(legacyResult.reason)
        }`
      );
    }

    if (primaryResult.status === 'rejected') {
      throw primaryResult.reason;
    }
  }
}
