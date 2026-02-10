/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  anonymizationProfileSchema,
  fieldRuleSchema,
  regexRuleSchema,
  nerRuleSchema,
  replacementsSetSchema,
  tokenSourceEntrySchema,
} from './schemas';

/**
 * A per-field rule specifying whether the field is allowed as context,
 * and whether its value should be anonymized (tokenized).
 */
export type FieldRule = z.infer<typeof fieldRuleSchema>;

/**
 * A regex-based anonymization rule that matches patterns in free text.
 */
export type RegexRule = z.infer<typeof regexRuleSchema>;

/**
 * A Named Entity Recognition (NER) rule that uses an ML model to detect entities.
 * Only applied when a trusted NER model is configured and available.
 */
export type NerRule = z.infer<typeof nerRuleSchema>;

/**
 * An Anonymization Profile: a reusable policy configuration scoped to a target
 * (data view, index pattern, or index) within a Kibana space.
 */
export type AnonymizationProfile = z.infer<typeof anonymizationProfileSchema>;

/**
 * A replacements set: persisted token→original mappings scoped to a
 * thread or execution within a space.
 */
export type ReplacementsSet = z.infer<typeof replacementsSetSchema>;

/**
 * A single token source entry describing where a token was produced.
 */
export type TokenSourceEntry = z.infer<typeof tokenSourceEntrySchema>;

/**
 * The effective policy state for a single field after resolution.
 */
export type EffectiveFieldPolicy =
  | { action: 'deny' }
  | { action: 'allow' }
  | { action: 'anonymize'; entityClass: string };

/**
 * The effective policy for all fields after resolving one or more profiles.
 * Keyed by field name.
 */
export type EffectivePolicy = Record<string, EffectiveFieldPolicy>;
