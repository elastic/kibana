/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuilderFieldsManifest } from '@kbn/alerting-v2-rule-builders';
import { detectionRuleBuilderFieldsManifest } from '@kbn/security-detection-rule-builder-fields';
import { assertBuilderFieldsManifests } from './assert_builder_fields_manifests';

/**
 * One entry per contributing solution. The framework assembles both halves of
 * the alerting_rule saved-object type from this list:
 *
 * - Static mapping: mergeBuilderFieldMappings over every currentMappings
 *   (in rule_mappings.ts).
 * - Model versions: one fold line per manifest version, each named by
 *   fromBuilderFieldsManifest (in rule_model_versions.ts).
 *
 * Add one line here when a new solution contributes builder fields.
 *
 * Ref: builder-type-registration-redesign.md "Assembling the saved-object type"
 */
export const BUILDER_FIELDS_MANIFESTS: BuilderFieldsManifest[] = [
  detectionRuleBuilderFieldsManifest,
  // one line per contributing solution
];

// Run four build-time checks at module load. Any test or boot that imports
// BUILDER_FIELDS_MANIFESTS (directly or indirectly through rule_mappings) will
// exercise these. The fifth check, fold completeness, belongs to step B.5.
assertBuilderFieldsManifests(BUILDER_FIELDS_MANIFESTS);
