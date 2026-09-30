/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KEYWORD_SUB_FIELD_IGNORE_ABOVE,
  type BuilderFieldsManifest,
} from '@kbn/alerting-v2-rule-builders';
import { detectionRuleBuilderFieldMappings } from '../mappings';

/**
 * The storage manifest for every detection rule builder type.
 *
 * The two halves answer different questions:
 * - `currentMappings`: which typed sub-fields does a detection rule index today?
 *   Assembled from the grouped mapping objects and placed into the container's
 *   properties.
 * - `versions`: what did each released version add, in the order versions shipped?
 *   Each version's `addedMappings` are always literals, never references to the
 *   mapping objects above, so that a later edit to `currentMappings` cannot change
 *   what a deployed version recorded.
 *
 * One manifest covers every detection rule builder type because the sub-field
 * properties table is shared across all of them, and a model version is scarce
 * (one pull request may add exactly one new model version to a saved-object type).
 */
export const detectionRuleBuilderFieldsManifest: BuilderFieldsManifest = {
  /** The builder types whose rules these versions describe. */
  builderTypes: ['security.detection.query', 'security.detection.threshold'],
  currentMappings: detectionRuleBuilderFieldMappings,
  currentVersion: 1,
  versions: {
    // Frozen once released. Every leaf is a literal, never a reference to the
    // mapping objects above. The reason: if addedMappings spread the grouped
    // objects, adding a leaf later would retroactively change what version 1
    // declares, and a deployment that already applied version 1 would never
    // reindex under the new leaf while a fresh deployment would — the same build
    // would index a field on some deployments and not others with no error anywhere.
    // KEYWORD_SUB_FIELD_IGNORE_ABOVE is the one name a literal carries: the rule
    // guards against a leaf appearing or vanishing retroactively, and a constant
    // that names a derived ceiling can do neither.
    1: {
      addedMappings: {
        severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        risk_score: { type: 'integer' },
        max_signals: { type: 'integer' },

        'threat.framework': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        'threat.tactic.id': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        'threat.tactic.name': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        'threat.tactic.reference': {
          type: 'keyword',
          ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
        },
        'threat.technique.id': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        'threat.technique.name': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        'threat.technique.reference': {
          type: 'keyword',
          ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
        },
        'threat.technique.subtechnique.id': {
          type: 'keyword',
          ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
        },
        'threat.technique.subtechnique.name': {
          type: 'keyword',
          ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
        },
        'threat.technique.subtechnique.reference': {
          type: 'keyword',
          ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
        },

        setup: { type: 'text' },
        note: { type: 'text' },

        references: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        false_positives: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        author: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        license: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },

        'related_integrations.package': {
          type: 'keyword',
          ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
        },
        'related_integrations.version': {
          type: 'keyword',
          ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
        },
        'related_integrations.integration': {
          type: 'keyword',
          ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
        },

        'required_fields.name': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        'required_fields.type': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        'required_fields.ecs': { type: 'boolean' },

        index: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        query: { type: 'text' },
        language: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },

        'threshold.field': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        'threshold.value': { type: 'integer' },
        'threshold.cardinality.field': {
          type: 'keyword',
          ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
        },
        'threshold.cardinality.value': { type: 'integer' },
      },
    },
  },
};
