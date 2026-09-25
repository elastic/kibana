/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { optionalWithDescription as opt } from './common';
import { ruleResponseSchema } from './rule_data_schema';

export const RULE_ATTACHMENT_TYPE = 'platform.alerting.rule' as const;

/**
 * Data stored inside a rule attachment.
 *
 * Server-generated fields (id, enabled, created_at, updated_at, metadata.version,
 * metadata.revision, metadata.signature_id, metadata.source) are optional so that the
 * same schema covers both:
 *   - proposed rules (by-value, not yet saved — no id, audit fields, or server counters)
 *   - saved rules    (by-reference, linked via attachment.origin = rule saved object id)
 *
 * The `created_by` / `updated_by` actors are excluded entirely: nothing on the
 * attachment side reads them, and we don't want per-user identity baked into a
 * conversation attachment. The timestamps stay because staleness detection
 * compares `updated_at` against the snapshot.
 *
 * `.strip()` undoes the `.strict()` inherited from the create-rule base schema,
 * making this a projection rather than a validator: callers hand over a whole
 * `RuleResponse` and the actors are dropped instead of raising
 * `unrecognized_keys`. It also lets attachments stored before the actors and
 * `metadata.owner` were removed still resolve. Unlike the strictness itself,
 * `.strip()` does not cascade, so the nested metadata needs its own.
 */
const { shape } = ruleResponseSchema;

export const ruleAttachmentDataSchema = ruleResponseSchema
  .omit({ created_by: true, updated_by: true })
  .extend({
    id: opt(shape.id),
    enabled: opt(shape.enabled),
    created_at: opt(shape.created_at),
    updated_at: opt(shape.updated_at),
    metadata: shape.metadata
      .extend({
        version: opt(shape.metadata.shape.version),
        // revision, signature_id, source, and ownership are server-generated/stamped,
        // so they are absent on proposed (not-yet-saved) rules — the server stamps
        // them at create time.
        revision: opt(shape.metadata.shape.revision),
        signature_id: opt(shape.metadata.shape.signature_id),
        source: opt(shape.metadata.shape.source),
        // Step 4.4: ownership is server-derived at create time; absent on proposed rules.
        ownership: opt(shape.metadata.shape.ownership),
      })
      .strip(),
  })
  .strip();

export type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;
