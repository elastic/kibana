/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { FieldDefinition } from '@kbn/streams-schema';
import { otelEquivalentLookupMap as logsOtelEquivalentLookupMap } from './logs_layer';

/**
 * The base mappings for the `alerts` root stream, aligned with the canonical
 * `.alerts-framework-mappings` component template.
 *
 * @see x-pack/platform/plugins/shared/streams/server/lib/streams/component_templates/logs_layer.ts
 */
export const baseFields: FieldDefinition = {
  '@timestamp': { type: 'date', ignore_malformed: false },
  'body.text': { type: 'match_only_text' },
  'event.kind': { type: 'keyword', ignore_above: 1024 },
  'event.action': { type: 'keyword', ignore_above: 1024 },
  'event.original': { type: 'keyword', ignore_above: 1024 },
  'kibana.alert.action_group': { type: 'keyword' },
  'kibana.alert.case_ids': { type: 'keyword' },
  'kibana.alert.consecutive_matches': { type: 'long' },
  'kibana.alert.duration.us': { type: 'long' },
  'kibana.alert.end': { type: 'date' },
  'kibana.alert.flapping': { type: 'boolean' },
  'kibana.alert.flapping_history': { type: 'boolean' },
  'kibana.alert.index_pattern': { type: 'keyword' },
  'kibana.alert.instance.id': { type: 'keyword' },
  'kibana.alert.intended_timestamp': { type: 'date' },
  'kibana.alert.last_detected': { type: 'date' },
  'kibana.alert.maintenance_window_ids': { type: 'keyword' },
  'kibana.alert.pending_recovered_count': { type: 'long' },
  'kibana.alert.previous_action_group': { type: 'keyword' },
  'kibana.alert.reason': { type: 'keyword', fields: { text: { type: 'match_only_text' } } },
  'kibana.alert.rule.category': { type: 'keyword' },
  'kibana.alert.rule.consumer': { type: 'keyword' },
  'kibana.alert.rule.execution.timestamp': { type: 'date' },
  'kibana.alert.rule.execution.type': { type: 'keyword' },
  'kibana.alert.rule.execution.uuid': { type: 'keyword' },
  'kibana.alert.rule.name': { type: 'keyword' },
  'kibana.alert.rule.producer': { type: 'keyword' },
  'kibana.alert.rule.uuid': { type: 'keyword' },
  'kibana.alert.rule.rule_type_id': { type: 'keyword' },
  'kibana.alert.rule.revision': { type: 'long' },
  'kibana.alert.rule.tags': { type: 'keyword' },
  'kibana.alert.severity_improving': { type: 'boolean' },
  'kibana.alert.start': { type: 'date' },
  'kibana.alert.status': { type: 'keyword' },
  'kibana.alert.updated_at': { type: 'date' },
  'kibana.alert.updated_by.user.id': { type: 'keyword' },
  'kibana.alert.updated_by.user.name': { type: 'keyword' },
  'kibana.alert.url': { type: 'keyword', index: false, ignore_above: 2048 },
  'kibana.alert.uuid': { type: 'keyword' },
  'kibana.alert.workflow_assignee_ids': { type: 'keyword' },
  'kibana.alert.workflow_status': { type: 'keyword' },
  'kibana.alert.workflow_tags': { type: 'keyword' },
  'kibana.space_ids': { type: 'keyword' },
  tags: { type: 'keyword' },
};

export const baseMappings: Exclude<MappingTypeMapping['properties'], undefined> = {
  body: {
    type: 'object',
    properties: {
      structured: {
        type: 'object',
        subobjects: false,
      },
    },
  },
  attributes: {
    type: 'object',
    subobjects: false,
  },
  resource: {
    type: 'object',
    properties: {
      attributes: {
        type: 'object',
        subobjects: false,
      },
    },
  },
  scope: {
    type: 'object',
    properties: {
      attributes: {
        type: 'object',
        subobjects: false,
      },
    },
  },
};

export const otelEquivalentLookupMap = logsOtelEquivalentLookupMap;

export const baseSettings = {
  index: {
    default_pipeline: 'hijack_dot_alerts_to_streams',
  },
};
