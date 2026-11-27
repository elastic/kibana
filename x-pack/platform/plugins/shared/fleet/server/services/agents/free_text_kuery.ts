/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';

import { AGENT_QUERYABLE_MAPPINGS } from '../../../common/constants';

interface MappingProperty {
  type?: string;
  properties?: Record<string, MappingProperty>;
  fields?: Record<string, MappingProperty>;
}

const SEARCHABLE_FIELD_TYPES: readonly string[] = ['keyword', 'text'];

// Runtime fields are declared in `AGENT_QUERYABLE_MAPPINGS` only so they pass kuery validation;
// a free text search on the index does not cover them.
const EXCLUDED_FIELDS: readonly string[] = ['status', 'signals', 'pipeline_config'];

const collectSearchableFields = (
  properties: Record<string, MappingProperty>,
  prefix = ''
): string[] =>
  Object.entries(properties).flatMap(([name, { type, properties: children, fields }]) => {
    const path = `${prefix}${name}`;
    const self = type && SEARCHABLE_FIELD_TYPES.includes(type) ? [path] : [];
    const nested = children ? collectSearchableFields(children, `${path}.`) : [];
    const multiFields = fields ? collectSearchableFields(fields, `${path}.`) : [];
    return [...self, ...nested, ...multiFields];
  });

/** The fields a field-less (free text) agent kuery term is searched on. */
export const AGENT_FREE_TEXT_SEARCH_FIELDS: readonly string[] = collectSearchableFields(
  AGENT_QUERYABLE_MAPPINGS.properties
).filter((field) => !EXCLUDED_FIELDS.includes(field));

const isKueryNode = (value: unknown): value is KueryNode =>
  typeof value === 'object' && value !== null && 'type' in value;

const isFreeTextTerm = (node: KueryNode): boolean => {
  if (node.type !== 'function' || node.function !== 'is') {
    return false;
  }
  const [fieldNode] = node.arguments;
  return isKueryNode(fieldNode) && nodeTypes.literal.isNode(fieldNode) && fieldNode.value === null;
};

/**
 * Rewrites field-less (free text) terms in an agent kuery to search `AGENT_FREE_TEXT_SEARCH_FIELDS`
 * instead of every field of the agents index. Terms that name a field are left unchanged.
 */
export const restrictAgentFreeTextSearch = (node: KueryNode): KueryNode => {
  if (isFreeTextTerm(node)) {
    const [, valueNode] = node.arguments;
    return nodeBuilder.or(
      AGENT_FREE_TEXT_SEARCH_FIELDS.map((field) => nodeBuilder.is(field, valueNode))
    );
  }
  if (node.type !== 'function') {
    return node;
  }
  const args: unknown[] = node.arguments;
  return {
    ...node,
    arguments: args.map((argument) =>
      isKueryNode(argument) ? restrictAgentFreeTextSearch(argument) : argument
    ),
  };
};
