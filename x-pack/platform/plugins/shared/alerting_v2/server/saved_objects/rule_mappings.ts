/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
import type { BuilderTypeManifest } from '@kbn/alerting-v2-rule-builders';
import { BUILDER_FIELDS_IGNORE_ABOVE } from '@kbn/alerting-v2-constants';
import {
  securityDetectionQueryManifest,
  securityDetectionThresholdManifest,
} from '@kbn/security-detection-rule-schema';
import { assembleBuilderFieldsMappings } from './assemble_builder_fields_mappings';

/**
 * The list of builder type manifests whose sub-field mappings are assembled
 * into `metadata.builder_fields.properties` in the static mapping.
 *
 * Each manifest listed here must have a corresponding fold line in
 * rule_model_versions.ts. The two sources — static mappings and model versions
 * — are deliberately coupled: both import the same manifest objects, so the
 * mappings and the version history cannot disagree, and core's startup
 * consistency check passes by construction.
 *
 * Identical sub-field declarations across manifests (e.g. the shared detection
 * fragment's risk_score/max_signals/note/setup) merge silently.
 * Conflicting declarations (same path, different field type) fail alerting_v2's
 * setup immediately.
 *
 * Ref: rule-type-registration.md "The fold into the saved-object registration"
 */
const BUILDER_MANIFESTS: BuilderTypeManifest[] = [
  securityDetectionQueryManifest,
  securityDetectionThresholdManifest,
];

/**
 * Mappings for the rule saved object.
 * For the full list of mappings, see:
 * https://github.com/elastic/kibana/blob/main/x-pack/plugins/alerting_v2/server/saved_objects/schemas/rule_saved_object_attributes/v1.ts
 */
export const ruleMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    kind: { type: 'keyword', ignore_above: 256 },
    metadata: {
      properties: {
        name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        description: { type: 'text' },
        tags: { type: 'keyword', ignore_above: 128 },
        builder_fields: {
          type: 'flattened',
          ignore_above: BUILDER_FIELDS_IGNORE_ABOVE,
          properties: assembleBuilderFieldsMappings(BUILDER_MANIFESTS),
        },
      },
    },
    enabled: { type: 'boolean' },
    schedule: {
      properties: {
        // Indexed so the maxScheduledPerMinute guardrail can aggregate the
        // scheduled frequency of enabled rules instead of scanning every rule.
        every: { type: 'keyword', ignore_above: 256 },
      },
    },
  },
};
