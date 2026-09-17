/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacyRuleShape } from '@kbn/alerting-v2-schemas';
import { collapseLegacyRuleShape } from '@kbn/alerting-v2-schemas';
import type { SavedObjectModelUnsafeTransformFn } from '@kbn/core-saved-objects-server';

interface RawRuleTemplateAttributes {
  engine?: string;
  rule?: Record<string, unknown>;
}

/**
 * The embedded rule is an opaque bag on disk, so the legacy `query` encoding is
 * confirmed before mapping and anything else is left for Zod to reject on read.
 * An already collapsed rule has no `query.format` and so is left alone.
 */
const isLegacyRuleShape = (
  rule: Record<string, unknown>
): rule is Record<string, unknown> & LegacyRuleShape => {
  const { kind, query } = rule;

  if (kind !== 'alert' && kind !== 'signal') {
    return false;
  }

  if (typeof query !== 'object' || query === null) {
    return false;
  }

  const { format } = query as Record<string, unknown>;

  return format === 'composed' || format === 'standalone';
};

/**
 * Adds the collapsed shape to the create-rule body an alerting v2 template
 * embeds. Alerting v1 and Fleet templates have no embedded v2 rule and pass
 * through untouched.
 *
 * Additive for the same reason as the rule migration: model version 5 still
 * requires the pre-collapse keys, so they stay on disk for the rollback window
 * and the read path strips them. Model version 7 removes them.
 */
export const migrateV2RuleTemplateQueryShape: SavedObjectModelUnsafeTransformFn<
  RawRuleTemplateAttributes,
  RawRuleTemplateAttributes
> = (doc) => {
  const { engine, rule } = doc.attributes;

  if (engine !== 'v2' || !rule || !isLegacyRuleShape(rule)) {
    return { document: doc };
  }

  const collapsed = collapseLegacyRuleShape(rule);

  return {
    document: {
      ...doc,
      attributes: {
        ...doc.attributes,
        rule: {
          ...rule,
          ...collapsed,
          query: { ...rule.query, ...collapsed.query },
          ...(rule.state_transition
            ? { state_transition: { ...rule.state_transition, ...collapsed.state_transition } }
            : {}),
        },
      },
    },
  };
};
