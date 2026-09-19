/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuilderTypeDefinition, BuilderTypeManifest } from '@kbn/alerting-v2-rule-builders';
import { DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS } from './detection_rule_common_fields';
import { enrichDetectionRuleEvent } from './enrich_detection_rule_event';
import {
  thresholdBuilderFieldsSchema,
  type ThresholdBuilderFields,
} from './threshold_builder_fields';
import { generateThresholdQuery } from './threshold_generate_query';

// ---------------------------------------------------------------------------
// Manifest
//
// Version 1 declares:
//   - The shared fragment's sub-field mappings (risk_score, max_signals, note,
//     setup as integer/integer/text/text).
//   - `query` as a text sub-field for full-text search over the pre-filter
//     query text.
//   - No backfill: this is the type's first version.
//
// Note: the shared fragment's mappings are repeated here by design — each
// composing type's manifest is self-contained.  Identical declarations merge
// silently at the fold step in alerting_v2's rule_model_versions.ts.
//
// Ref: rule-type-registration.md "The manifest shape"
//      rule-data-model.md "The shared detection fragment"
//      rule-data-model.md "security.detection.threshold"
// ---------------------------------------------------------------------------
export const securityDetectionThresholdManifest: BuilderTypeManifest = {
  type: 'security.detection.threshold',
  currentVersion: 1,
  versions: {
    1: {
      addedSubFieldMappings: {
        ...DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS,
        // query as text for full-text search on the pre-filter text.
        // The threshold schema allows an empty query (match-all), so the
        // sub-field is still declared to cover non-empty values.
        query: { type: 'text' },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// validateFields
//
// Rejects a cardinality.field that is also listed in threshold.field, because
// a distinct count over a grouping key is always trivially 1.
//
// Ref: rule-validation.md "The extra validation hook"
//      rule-execution-logic.md "security.detection.threshold"
// ---------------------------------------------------------------------------
export const validateThresholdFields = (fields: ThresholdBuilderFields): string[] => {
  const errors: string[] = [];
  const { field: groupingFields, cardinality } = fields.threshold;
  const cardinalityEntry = cardinality?.[0];
  if (cardinalityEntry !== undefined && groupingFields.includes(cardinalityEntry.field)) {
    errors.push(
      `cardinality.field "${cardinalityEntry.field}" is already listed in threshold.field; a distinct count over a grouping key is always 1`
    );
  }
  return errors;
};

// ---------------------------------------------------------------------------
// securityDetectionThreshold — the full BuilderTypeDefinition
//
// Properties:
//   type:         'security.detection.threshold'
//   name:         human-readable display name
//   kind:         'alert' — detection events are alert-kind (persistent-mode
//                 workaround; see alert-modes.md)
//   ownership:    managed by security/detection
//   compilation:  'execution_time' — query compiled on every run, never stored
//   manifest:     version 1 above
//   validateFields: rejects overlapping cardinality/grouping field
//   generateQuery:  compiles the ES|QL breach query
//   enrichRuleEvent: stamps severity, risk_score, and signature_id
//
// grouping is intentionally absent.  The STATS ... BY and the IS NOT NULL
// guards come from threshold.field directly, inside generateThresholdQuery.
// The framework's grouping field sits on top of those output rows and decides
// episode lifetime, not bucketing.  With deriveRuleFields dropped, the
// ungrouped fallback hash gives each output row its own episode, so one
// qualifying bucket produces one alert per run.
//
// Removing deriveRuleFields also removes a latent failure: an empty
// threshold.field would have produced grouping: { fields: [] }, which the
// saved-object schema rejects because it requires one to ten entries.
//
// Ref: rule-type-registration.md "What a registration declares"
//      rule-execution-logic.md "security.detection.threshold"
//      rule-event-generation-logic.md "What the POC types stamp"
//      alert-modes.md "Configuring a persistent mode with what exists today"
// ---------------------------------------------------------------------------
export const securityDetectionThreshold: BuilderTypeDefinition<ThresholdBuilderFields> = {
  type: 'security.detection.threshold',
  name: 'Threshold',
  description:
    'Detects events that meet a count or cardinality threshold within a grouping of field values.',
  kind: 'alert',
  ownership: { solution: 'security', domain: 'detection' },
  compilation: 'execution_time',
  builderFieldsSchema: thresholdBuilderFieldsSchema,
  validateFields: validateThresholdFields,
  manifest: securityDetectionThresholdManifest,
  generateQuery: generateThresholdQuery,
  enrichRuleEvent: enrichDetectionRuleEvent,
};
