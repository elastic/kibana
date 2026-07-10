/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVIDENCE_MAPPING_PROFILES } from './profiles';
import type {
  EvidenceItemKey,
  EvidenceItemOverrides,
  EvidenceItemSpec,
  EvidenceMapping,
  EvidenceMappingOverrides,
  EvidenceMappingProfileDefinition,
  EvidenceMappingRequest,
} from './types';

const ALLOWED_FIELD_PATH_RE = /^(attributes|resource\.attributes|body|scope)\./;
const ITEM_KEYS: EvidenceItemKey[] = ['user_query', 'agent_response', 'tool_calls'];

export class EvidenceMappingResolutionError extends Error {
  constructor(public readonly code: 'unknown_profile' | 'invalid_override_field', message: string) {
    super(message);
    this.name = 'EvidenceMappingResolutionError';
  }
}

const cloneItemSpec = (item: EvidenceItemSpec): EvidenceItemSpec => ({
  source: item.source,
  filter: item.filter.map((entry) => ({ ...entry })),
  fields: { ...item.fields },
  select: item.select,
  parse: item.parse,
});

const cloneMapping = (mapping: EvidenceMapping): EvidenceMapping => ({
  user_query: cloneItemSpec(mapping.user_query),
  agent_response: cloneItemSpec(mapping.agent_response),
  tool_calls: cloneItemSpec(mapping.tool_calls),
});

const mergeItem = (base: EvidenceItemSpec, overrides?: EvidenceItemOverrides): EvidenceItemSpec => {
  if (!overrides) {
    return cloneItemSpec(base);
  }

  return {
    source: overrides.source ?? base.source,
    filter: overrides.filter
      ? overrides.filter.map((entry) => ({ ...entry }))
      : base.filter.map((entry) => ({ ...entry })),
    fields: {
      ...base.fields,
      ...(overrides.fields ?? {}),
    },
    select: overrides.select ?? base.select,
    parse: overrides.parse ?? base.parse,
  };
};

const mergeMapping = (
  base: EvidenceMapping,
  overrides?: EvidenceMappingOverrides
): EvidenceMapping => ({
  user_query: mergeItem(base.user_query, overrides?.user_query),
  agent_response: mergeItem(base.agent_response, overrides?.agent_response),
  tool_calls: mergeItem(base.tool_calls, overrides?.tool_calls),
});

const isAllowedFieldPath = (field: string): boolean =>
  field === 'event_name' || ALLOWED_FIELD_PATH_RE.test(field);

const validateItemOverrideFields = (itemKey: EvidenceItemKey, item?: EvidenceItemOverrides) => {
  if (!item) {
    return;
  }

  for (const filter of item.filter ?? []) {
    if (!isAllowedFieldPath(filter.field)) {
      throw new EvidenceMappingResolutionError(
        'invalid_override_field',
        `Invalid override field path for ${itemKey}: ${filter.field}`
      );
    }
  }

  for (const fieldPath of Object.values(item.fields ?? {})) {
    if (!isAllowedFieldPath(fieldPath)) {
      throw new EvidenceMappingResolutionError(
        'invalid_override_field',
        `Invalid override field path for ${itemKey}: ${fieldPath}`
      );
    }
  }
};

const validateOverrides = (overrides?: EvidenceMappingOverrides) => {
  if (!overrides) {
    return;
  }

  for (const itemKey of ITEM_KEYS) {
    validateItemOverrideFields(itemKey, overrides[itemKey]);
  }
};

const resolveProfileDefinition = (
  profile: string,
  visited: Set<string>
): EvidenceMappingProfileDefinition => {
  if (visited.has(profile)) {
    throw new EvidenceMappingResolutionError(
      'unknown_profile',
      `Circular evidence mapping profile reference: ${profile}`
    );
  }

  const definition = EVIDENCE_MAPPING_PROFILES[profile];
  if (!definition) {
    throw new EvidenceMappingResolutionError(
      'unknown_profile',
      `Unknown evidence mapping profile: ${profile}`
    );
  }

  if (!definition.extends) {
    return definition;
  }

  visited.add(profile);
  const baseDefinition = resolveProfileDefinition(definition.extends, visited);
  visited.delete(profile);

  if (!baseDefinition.mapping) {
    throw new EvidenceMappingResolutionError(
      'unknown_profile',
      `Base evidence mapping profile has no concrete mapping: ${definition.extends}`
    );
  }

  return {
    mapping: mergeMapping(baseDefinition.mapping, definition.overrides),
  };
};

export const resolveEvidenceMapping = (request: EvidenceMappingRequest): EvidenceMapping => {
  const definition = resolveProfileDefinition(request.profile, new Set());
  if (!definition.mapping) {
    throw new EvidenceMappingResolutionError(
      'unknown_profile',
      `Evidence mapping profile does not resolve to a concrete mapping: ${request.profile}`
    );
  }

  validateOverrides(request.overrides);

  return mergeMapping(cloneMapping(definition.mapping), request.overrides);
};
