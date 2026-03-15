/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_AGENT_ID,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_URL,
  OBSERVABLE_TYPE_USER,
  OBSERVABLE_TYPE_PROCESS,
  OBSERVABLE_TYPE_REGISTRY,
  OBSERVABLE_TYPE_SERVICE,
} from '../constants/observables';

/**
 * Strategy for resolving the observable type from a value.
 * - 'static': always maps to the specified typeKey
 * - 'ip': inspects the value to determine IPv4 vs IPv6
 */
type MappingStrategy = 'static' | 'ip';

export interface EcsFieldMapping {
  ecsField: string;
  typeKey: string;
  strategy: MappingStrategy;
}

const HASH_FIELDS = [
  'cdhash',
  'md5',
  'sha1',
  'sha256',
  'sha384',
  'sha512',
  'ssdeep',
  'tlsh',
] as const;

const HASH_PARENTS = ['dll', 'file', 'process'] as const;

function buildHashMappings(): EcsFieldMapping[] {
  return HASH_PARENTS.flatMap((parent) =>
    HASH_FIELDS.map((field) => ({
      ecsField: `${parent}.hash.${field}`,
      typeKey: OBSERVABLE_TYPE_FILE_HASH.key,
      strategy: 'static' as const,
    }))
  );
}

/**
 * Default ECS field → observable type mappings.
 *
 * The 'ip' strategy inspects the value to determine IPv4 vs IPv6.
 * The 'static' strategy always maps to the declared typeKey.
 */
export const DEFAULT_ECS_FIELD_MAPPINGS: EcsFieldMapping[] = [
  // IP addresses (require runtime inspection for v4/v6)
  { ecsField: 'source.ip', typeKey: OBSERVABLE_TYPE_IPV4.key, strategy: 'ip' },
  { ecsField: 'destination.ip', typeKey: OBSERVABLE_TYPE_IPV4.key, strategy: 'ip' },

  // Hostname
  { ecsField: 'host.name', typeKey: OBSERVABLE_TYPE_HOSTNAME.key, strategy: 'static' },

  // File hash (expanded from HASH_PARENTS × HASH_FIELDS)
  ...buildHashMappings(),

  // File path
  { ecsField: 'file.path', typeKey: OBSERVABLE_TYPE_FILE_PATH.key, strategy: 'static' },

  // Domain
  { ecsField: 'dns.question.name', typeKey: OBSERVABLE_TYPE_DOMAIN.key, strategy: 'static' },

  // Agent ID
  { ecsField: 'agent.id', typeKey: OBSERVABLE_TYPE_AGENT_ID.key, strategy: 'static' },

  // User
  { ecsField: 'user.name', typeKey: OBSERVABLE_TYPE_USER.key, strategy: 'static' },

  // Email
  { ecsField: 'user.email', typeKey: OBSERVABLE_TYPE_EMAIL.key, strategy: 'static' },

  // Process
  { ecsField: 'process.name', typeKey: OBSERVABLE_TYPE_PROCESS.key, strategy: 'static' },
  { ecsField: 'process.executable', typeKey: OBSERVABLE_TYPE_PROCESS.key, strategy: 'static' },

  // URL
  { ecsField: 'url.full', typeKey: OBSERVABLE_TYPE_URL.key, strategy: 'static' },
  { ecsField: 'url.original', typeKey: OBSERVABLE_TYPE_URL.key, strategy: 'static' },

  // Registry
  { ecsField: 'registry.path', typeKey: OBSERVABLE_TYPE_REGISTRY.key, strategy: 'static' },

  // Service
  { ecsField: 'service.name', typeKey: OBSERVABLE_TYPE_SERVICE.key, strategy: 'static' },
];

/**
 * Build a lookup map from ECS field name → mapping, for O(1) field lookups.
 */
export function buildFieldMappingIndex(mappings: EcsFieldMapping[]): Map<string, EcsFieldMapping> {
  const index = new Map<string, EcsFieldMapping>();
  for (const mapping of mappings) {
    index.set(mapping.ecsField, mapping);
  }
  return index;
}

/**
 * Returns the set of all ECS field names covered by the given mappings.
 */
export function getRegisteredEcsFields(mappings: EcsFieldMapping[]): Set<string> {
  return new Set(mappings.map((m) => m.ecsField));
}
