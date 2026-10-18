/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KEYWORD_SUB_FIELD_IGNORE_ABOVE,
  type MappingProperty,
} from '@kbn/alerting-v2-rule-builders';

/** The fields every detection rule type defines. */
export const commonDetectionRuleBuilderFieldMappings: Record<string, MappingProperty> = {
  severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  risk_score: { type: 'integer' },
  max_signals: { type: 'integer' },

  'threat.framework': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'threat.tactic.id': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'threat.tactic.name': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'threat.tactic.reference': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'threat.technique.id': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'threat.technique.name': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'threat.technique.reference': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
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

  'related_integrations.package': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'related_integrations.version': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'related_integrations.integration': {
    type: 'keyword',
    ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
  },

  'required_fields.name': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'required_fields.type': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  'required_fields.ecs': { type: 'boolean' },
};
