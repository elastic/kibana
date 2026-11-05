/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILDER_FIELDS_IGNORE_ABOVE } from '@kbn/alerting-v2-constants';
import { KEYWORD_SUB_FIELD_IGNORE_ABOVE } from '@kbn/alerting-v2-rule-builders';
import { ruleMappings } from './rule_mappings';
// Importing ruleModelVersions triggers fromBuilderFieldsManifest() side effects
// (globalFoldedVersions population) needed by the cross-check below.
import { ruleModelVersions } from './model_versions/rule_model_versions';

describe('ruleMappings', () => {
  // ---------------------------------------------------------------------------
  // builder_fields mapping
  // ---------------------------------------------------------------------------

  describe('metadata.builder_fields', () => {
    // Helper: reach into the mappings structure.
    const getBuilderFieldsMapping = () => {
      const meta = ruleMappings.properties?.metadata as
        | { properties?: Record<string, unknown> }
        | undefined;
      return meta?.properties?.builder_fields as
        | {
            type?: string;
            ignore_above?: number;
            properties?: Record<string, unknown>;
          }
        | undefined;
    };

    it('uses the flattened mapping type', () => {
      expect(getBuilderFieldsMapping()?.type).toBe('flattened');
    });

    it('sets ignore_above to the framework constant', () => {
      expect(getBuilderFieldsMapping()?.ignore_above).toBe(BUILDER_FIELDS_IGNORE_ABOVE);
    });

    it('every mappings_addition builder_fields property in ruleModelVersions is a subset of the static mapping', () => {
      // Guard: the static mapping drives the schema for builder_fields.properties.
      // Each manifest fold emits a mappings_addition; core's startup consistency
      // check requires every added property to already exist in the static mapping.
      // This test proves that statically, so the failure surface is a test run
      // rather than a Kibana boot failure.
      //
      // Both sides of the check come from one source: every mappings_addition a
      // folded version declares is in the static mapping because both came from the
      // same manifest (builder_fields_manifests.ts). validateAddedMappings passes
      // by construction.
      //
      // Ref: builder-type-registration-redesign.md "Assembling the saved-object type"
      const staticBuilderFieldsProperties = (getBuilderFieldsMapping()?.properties ?? {}) as Record<
        string,
        unknown
      >;

      for (const [, versionDef] of Object.entries(ruleModelVersions)) {
        const version = versionDef as {
          changes?: Array<{ type: string; addedMappings?: unknown }>;
        };
        for (const change of version.changes ?? []) {
          if (change.type !== 'mappings_addition') continue;
          // Drill into addedMappings.metadata.properties.builder_fields.properties
          const addedMappings = change.addedMappings as Record<string, unknown> | undefined;
          const metadataProps = (addedMappings?.metadata as { properties?: unknown } | undefined)
            ?.properties as Record<string, unknown> | undefined;
          const addedBuilderFields = (
            metadataProps?.builder_fields as { properties?: unknown } | undefined
          )?.properties as Record<string, unknown> | undefined;
          if (!addedBuilderFields) continue;

          for (const key of Object.keys(addedBuilderFields)) {
            // The static mapping must contain this key.
            expect(Object.keys(staticBuilderFieldsProperties)).toContain(key);
            // And the mapping for that key must match exactly.
            expect(staticBuilderFieldsProperties[key]).toEqual(addedBuilderFields[key]);
          }
        }
      }
    });

    it('carries the merged sub-field mappings from the detection rule builder fields manifest (32 leaves)', () => {
      // BUILDER_FIELDS_MANIFESTS contains detectionRuleBuilderFieldsManifest, which declares
      // 32 sub-fields: 25 common leaves, 3 shared by both query and threshold types (index, query,
      // language), and 4 threshold-only leaves. The static mapping must carry all of them so that
      // core's startup consistency check (validateAddedMappings) passes for every folded version.
      //
      // Ref: builder-type-registration-redesign.md "The sub-field mappings"
      const mapping = getBuilderFieldsMapping();
      expect(mapping).toHaveProperty('properties');

      const properties = mapping?.properties as Record<string, unknown>;
      expect(Object.keys(properties)).toHaveLength(32);

      // Common fields (25)
      expect(properties.severity).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties.risk_score).toEqual({ type: 'integer' });
      expect(properties.max_signals).toEqual({ type: 'integer' });
      expect(properties['threat.framework']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threat.tactic.id']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threat.tactic.name']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threat.tactic.reference']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threat.technique.id']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threat.technique.name']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threat.technique.reference']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threat.technique.subtechnique.id']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threat.technique.subtechnique.name']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threat.technique.subtechnique.reference']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties.setup).toEqual({ type: 'text' });
      expect(properties.note).toEqual({ type: 'text' });
      expect(properties.references).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties.false_positives).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties.author).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties.license).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['related_integrations.package']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['related_integrations.version']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['related_integrations.integration']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['required_fields.name']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['required_fields.type']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['required_fields.ecs']).toEqual({ type: 'boolean' });

      // Shared by query and threshold (3 — merge silently from both types)
      expect(properties.index).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties.query).toEqual({ type: 'text' });
      expect(properties.language).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });

      // Threshold-only (4)
      expect(properties['threshold.field']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threshold.value']).toEqual({ type: 'integer' });
      expect(properties['threshold.cardinality.field']).toEqual({
        type: 'keyword',
        ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
      });
      expect(properties['threshold.cardinality.value']).toEqual({ type: 'integer' });
    });
  });
});
