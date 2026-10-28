/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Machine-readable codes carried in `labels.code` of this plugin's warn and error logs. */
export const MIGRATION_LOG_CODES = {
  /**
   * Migrating a classic rule failed and undoing what it had already created
   * failed too. The leftover rule, action policy or workflow is carried in
   * `labels` and must be deleted by hand.
   */
  RULE_MIGRATION_ROLLBACK_FAILED: 'RULE_MIGRATION_ROLLBACK_FAILED',
  /** Registering an Agent Builder skill failed; the skill is unavailable. */
  AGENT_BUILDER_SKILL_REGISTER_FAILED: 'AGENT_BUILDER_SKILL_REGISTER_FAILED',
  /** The get_classic_rule tool failed with an unexpected (non-403/404) error. */
  AGENT_BUILDER_GET_CLASSIC_RULE_FAILED: 'AGENT_BUILDER_GET_CLASSIC_RULE_FAILED',
} as const;
