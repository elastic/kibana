/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  CreateRuleBody,
  IRulesManagementClient,
  UpdateRuleBody,
} from './rules_management_client';

/**
 * Routes writes to the primary client and cleans up the legacy client on every operation.
 *
 * Used in both flag states:
 * - Flag ON:  primary = v2, legacy = v1 — creates on v2, cleans up stale v1 rules.
 * - Flag OFF: primary = v1, legacy = v2 — creates on v1, cleans up orphaned v2 rules.
 *
 * On create/update the legacy side's rule is deleted (best-effort). On bulk delete both
 * sides are targeted. Errors from the legacy adapter are logged and swallowed so a
 * missing legacy rule never blocks the primary operation.
 */
export class DualCleanupRulesAdapter implements IRulesManagementClient {
  constructor(
    private readonly primary: IRulesManagementClient,
    private readonly legacy: IRulesManagementClient,
    private readonly logger: Logger
  ) {}

  async createRule(id: string, body: CreateRuleBody): Promise<void> {
    await this.primary.createRule(id, body);
    await this.cleanupLegacyRule(id);
  }

  async updateRule(id: string, body: UpdateRuleBody): Promise<void> {
    await this.primary.updateRule(id, body);
    await this.cleanupLegacyRule(id);
  }

  async bulkDeleteRules(ids: string[]): Promise<void> {
    const [primaryResult, legacyResult] = await Promise.allSettled([
      this.primary.bulkDeleteRules(ids),
      this.legacy.bulkDeleteRules(ids),
    ]);

    if (legacyResult.status === 'rejected') {
      this.logger.warn(
        `Legacy rule cleanup failed for ${
          ids.length
        } rule(s) — orphaned rules may continue running: ${
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

  private async cleanupLegacyRule(id: string): Promise<void> {
    try {
      await this.legacy.bulkDeleteRules([id]);
    } catch (error) {
      this.logger.debug(
        `Legacy rule cleanup for "${id}" failed (may not exist): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
