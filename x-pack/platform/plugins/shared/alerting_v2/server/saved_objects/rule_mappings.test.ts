/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILDER_FIELDS_IGNORE_ABOVE } from '@kbn/alerting-v2-constants';
import { ruleMappings } from './rule_mappings';

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

    it('has a properties key fed by assembleBuilderFieldsMappings', () => {
      // The static mapping must carry a `properties` entry so that
      // mappings_addition changes produced by fromBuilderManifest are
      // verbatim present in the type's static mappings — as required by core.
      //
      // With an empty BUILDER_MANIFESTS list the result is an empty object,
      // but the key itself must exist so step 3.5 can populate it by routing
      // detection-type manifests in.
      //
      // Ref: rule-type-registration.md "The fold into the saved-object registration"
      const mapping = getBuilderFieldsMapping();
      expect(mapping).toHaveProperty('properties');
      // No manifests registered yet — the assembled properties are empty.
      expect(mapping?.properties).toEqual({});
    });
  });
});
