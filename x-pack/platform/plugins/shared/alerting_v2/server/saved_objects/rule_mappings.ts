/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
import type { BuilderTypeManifest } from '@kbn/alerting-v2-rule-builders';
import { BUILDER_FIELDS_IGNORE_ABOVE } from '@kbn/alerting-v2-constants';
import { assembleBuilderFieldsMappings } from './assemble_builder_fields_mappings';

/**
 * The list of builder type manifests whose sub-field mappings are assembled
 * into `metadata.builder_fields.properties` in the static mapping.
 *
 * Starts empty: no builder types are registered on this branch yet. Step 3.5
 * routes the two detection-type manifests (`securityDetectionQuery` and
 * `securityDetectionThreshold`) in here. Two manifests declaring the same leaf
 * path with different field types fail `alerting_v2`'s setup; identical
 * declarations merge silently (the shared detection fragment's sub-fields).
 *
 * Ref: rule-type-registration.md "The fold into the saved-object registration"
 */
const BUILDER_MANIFESTS: BuilderTypeManifest[] = [];

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
