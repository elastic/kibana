/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABLE_TYPE_AGENT_ID,
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_URL,
} from '../constants/observables';

// https://www.elastic.co/docs/reference/ecs/ecs-hash
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

// https://www.elastic.co/docs/reference/ecs/ecs-hash
const HASH_PARENTS = ['dll', 'file', 'process'] as const;

export const getHashFields = (): string[] =>
  HASH_PARENTS.map((parent) => HASH_FIELDS.map((field) => `${parent}.hash.${field}`)).flat();

// The two patterns must never match the same value: a value with ':' is IPv6, any other is IPv4.
export const IPV4_VALUE_PATTERN = '^[^:]*$';
export const IPV6_VALUE_PATTERN = ':';

export interface ObservableTypePath {
  readonly path: string;
  readonly enabled: boolean;
  /** Values of this field that extraction skips, compared exactly. */
  readonly excludedValues?: string[];
}

export interface DefaultObservableType {
  readonly key: string;
  readonly label: string;
  readonly paths: readonly ObservableTypePath[];
  readonly valuePattern?: string;
}

const toEnabledPaths = (paths: readonly string[]): ObservableTypePath[] =>
  paths.map((path) => ({ path, enabled: true }));

/**
 * The built-in observable types, keyed by type key, with the alert fields that auto-extraction reads.
 */
export const DEFAULT_OBSERVABLE_TYPES: Readonly<Record<string, DefaultObservableType>> = {
  [OBSERVABLE_TYPE_AGENT_ID.key]: {
    ...OBSERVABLE_TYPE_AGENT_ID,
    paths: toEnabledPaths(['agent.id']),
  },
  [OBSERVABLE_TYPE_IPV4.key]: {
    ...OBSERVABLE_TYPE_IPV4,
    paths: toEnabledPaths(['source.ip', 'destination.ip']),
    valuePattern: IPV4_VALUE_PATTERN,
  },
  [OBSERVABLE_TYPE_IPV6.key]: {
    ...OBSERVABLE_TYPE_IPV6,
    paths: toEnabledPaths(['source.ip', 'destination.ip']),
    valuePattern: IPV6_VALUE_PATTERN,
  },
  [OBSERVABLE_TYPE_URL.key]: {
    ...OBSERVABLE_TYPE_URL,
    paths: [],
  },
  [OBSERVABLE_TYPE_HOSTNAME.key]: {
    ...OBSERVABLE_TYPE_HOSTNAME,
    paths: toEnabledPaths(['host.name']),
  },
  [OBSERVABLE_TYPE_FILE_HASH.key]: {
    ...OBSERVABLE_TYPE_FILE_HASH,
    paths: toEnabledPaths(getHashFields()),
  },
  [OBSERVABLE_TYPE_FILE_PATH.key]: {
    ...OBSERVABLE_TYPE_FILE_PATH,
    paths: toEnabledPaths(['file.path']),
  },
  [OBSERVABLE_TYPE_EMAIL.key]: {
    ...OBSERVABLE_TYPE_EMAIL,
    paths: [],
  },
  [OBSERVABLE_TYPE_DOMAIN.key]: {
    ...OBSERVABLE_TYPE_DOMAIN,
    paths: toEnabledPaths(['dns.question.name']),
  },
};
