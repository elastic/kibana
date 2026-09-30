/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
import { BUILDER_FIELDS_IGNORE_ABOVE } from '@kbn/alerting-v2-constants';
import { mergeBuilderFieldMappings } from '@kbn/alerting-v2-rule-builders';
import { BUILDER_FIELDS_MANIFESTS } from './builder_fields_manifests';

/**
 * The merged sub-field mappings for metadata.builder_fields, assembled from every
 * contributing solution's manifest. Used both in the static mapping below and by
 * the rules-client's sort and search derivations, so it is exported rather than
 * computed inline in the mapping definition.
 *
 * Ref: builder-type-registration-redesign.md "Assembling the saved-object type"
 */
export const mergedBuilderFieldMappings = mergeBuilderFieldMappings(
  ...BUILDER_FIELDS_MANIFESTS.map((manifest) => manifest.currentMappings)
);

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

        // Ref: rule-types.md "The discriminator must be indexed and filterable"
        builder_type: { type: 'keyword', ignore_above: 256 },

        // Both sides of core's startup check (validateAddedMappings) come from one source:
        // every mappings_addition a folded version declares is in the static mapping because
        // both came from the same manifest. The check passes by construction.
        // Ref: builder-type-registration-redesign.md "Assembling the saved-object type"
        builder_fields: {
          type: 'flattened',
          ignore_above: BUILDER_FIELDS_IGNORE_ABOVE,
          properties: mergedBuilderFieldMappings,
        },

        // Ref: rule-ownership.md "Storage, mapping, and migration"
        ownership: {
          properties: {
            managed: { type: 'boolean' },
            solution: { type: 'keyword', ignore_above: 256 },
            domain: { type: 'keyword', ignore_above: 256 },
            app: { type: 'keyword', ignore_above: 128 },
          },
        },

        // Ref: rule-source.md "Storage and migration"
        source: {
          properties: {
            type: { type: 'keyword', ignore_above: 256 },
            id: { type: 'keyword', ignore_above: 256 },
            version: { type: 'integer' },
          },
        },

        // Mirrors the squashed model version '7' framework-fields mappings_addition verbatim.
        // (Originally designed as a standalone model version '10' on this POC branch;
        // see the commented block in rule_model_versions.ts for the per-version story.)
        // Kibana core validates at startup that every addition declared in
        // a model version is present verbatim in the static mappings.
        // Ref: rule-identity.md "Storage and migration"
        signature_id: { type: 'keyword', ignore_above: 256 },
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
