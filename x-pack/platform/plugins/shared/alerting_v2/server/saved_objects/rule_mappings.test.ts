/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILDER_FIELDS_IGNORE_ABOVE } from '@kbn/alerting-v2-constants';
import { ruleMappings } from './rule_mappings';
// Importing ruleModelVersions triggers fromBuilderManifest() side effects
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
      // Ref: rule-type-registration.md "The fold into the saved-object registration"
      const staticBuilderFieldsProperties = (getBuilderFieldsMapping()?.properties ?? {}) as Record<
        string,
        unknown
      >;

      for (const [versionKey, versionDef] of Object.entries(ruleModelVersions)) {
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
            expect(staticBuilderFieldsProperties).toHaveProperty(
              key,
              undefined === staticBuilderFieldsProperties[key]
                ? undefined
                : staticBuilderFieldsProperties[key]
            );
            // Use a real assertion: the static mapping must contain this key.
            expect(Object.keys(staticBuilderFieldsProperties)).toContain(key);
            // And the mapping for that key must match exactly.
            expect(staticBuilderFieldsProperties[key]).toEqual(addedBuilderFields[key]);
          }
        }
        // reference versionKey in assertion message
        void versionKey;
      }
    });

    it('carries the merged sub-field mappings from the two detection-type manifests', () => {
      // Step 3.5 routes securityDetectionQueryManifest and
      // securityDetectionThresholdManifest into BUILDER_MANIFESTS. Both declare
      // the shared detection fragment's sub-fields (risk_score, max_signals,
      // note, setup) plus `query` as text. Identical declarations across
      // manifests merge silently; the merged result is the union.
      //
      // Core requires every mappings_addition declared in a model version to be
      // verbatim present in the static mappings. This test confirms that the
      // static mapping carries exactly those sub-fields so core's startup
      // consistency check passes.
      //
      // Ref: rule-type-registration.md "The fold into the saved-object registration"
      const mapping = getBuilderFieldsMapping();
      expect(mapping).toHaveProperty('properties');
      expect(mapping?.properties).toEqual({
        risk_score: { type: 'integer' },
        max_signals: { type: 'integer' },
        note: { type: 'text' },
        setup: { type: 'text' },
        query: { type: 'text' },
      });
    });
  });
});
