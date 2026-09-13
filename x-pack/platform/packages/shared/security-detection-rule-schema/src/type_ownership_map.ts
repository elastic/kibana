/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maps every managed detection rule builder type id to its ownership record.
 *
 * Imported by:
 *   - Phase 4's ownership backfill (model version '9') to stamp managed rules.
 *   - Each type's manifest fold in rule_model_versions.ts.
 *   - The security_detections plugin's registerBuilderType calls (Phase 8).
 *
 * This is a plain data constant with no imports from any plugin.
 *
 * Ref: rule-type-registration.md "What a registration declares" (ownership)
 *      rule-ownership.md "The ownership object"
 */
export const DETECTION_RULE_TYPE_OWNERSHIP: Record<string, { solution: string; domain: string }> = {
  'security.detection.query': { solution: 'security', domain: 'detection' },
  'security.detection.threshold': { solution: 'security', domain: 'detection' },
};
