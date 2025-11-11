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
  'attributes.alert.start': { type: 'date' },
  'attributes.alert.end': { type: 'date' },
  'attributes.alert.flapping': { type: 'boolean' },
  'attributes.alert.status': { type: 'keyword', ignore_above: 1024 },
  'attributes.alert.id': { type: 'keyword', ignore_above: 1024 },
  'attributes.rule.query': { type: 'keyword', ignore_above: 2048 },
  'attributes.rule.id': { type: 'keyword', ignore_above: 1024 },
  'attributes.rule.execution.uuid': { type: 'keyword', ignore_above: 1024 },
  'attributes.entity.key': { type: 'keyword', ignore_above: 2048 },
  'attributes.lineage.parents': { type: 'keyword', ignore_above: 1024 },
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
  'alert.start': {
    path: 'attributes.alert.start',
    type: 'alias',
  },
  'alert.end': {
    path: 'attributes.alert.end',
    type: 'alias',
  },
  'alert.flapping': {
    path: 'attributes.alert.flapping',
    type: 'alias',
  },
  'alert.status': {
    path: 'attributes.alert.status',
    type: 'alias',
  },
  'alert.id': {
    path: 'attributes.alert.id',
    type: 'alias',
  },
  'rule.query': {
    path: 'attributes.rule.query',
    type: 'alias',
  },
  'rule.id': {
    path: 'attributes.rule.id',
    type: 'alias',
  },
  'rule.execution.uuid': {
    path: 'attributes.rule.execution.uuid',
    type: 'alias',
  },
  'entity.key': {
    path: 'attributes.entity.key',
    type: 'alias',
  },
  'lineage.parents': {
    path: 'attributes.lineage.parents',
    type: 'alias',
  },
};

export const otelEquivalentLookupMap = logsOtelEquivalentLookupMap;
