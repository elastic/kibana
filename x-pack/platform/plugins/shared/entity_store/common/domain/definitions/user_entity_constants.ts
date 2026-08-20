/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical `entity.namespace` value for non-IDP local user identity
 * (`userEntityDefinition` ranking branch, fieldEvaluations, streamlang conditions).
 */
export const USER_ENTITY_NAMESPACE = {
  Local: 'local',
} as const;

export type UserEntityLocalNamespace =
  (typeof USER_ENTITY_NAMESPACE)[keyof typeof USER_ENTITY_NAMESPACE];

/** User names excluded from local namespace (system/service accounts). Used by `userEntityDefinition` non-IDP filters. */
export const LOCAL_NAMESPACE_EXCLUDED_USER_NAMES = [
  'root',
  'bin',
  'daemon',
  'sys',
  'nobody',
  'jenkins',
  'ansible',
  'deploy',
  'terraform',
  'gitlab-runner',
  'postgres',
  'mysql',
  'redis',
  'elasticsearch',
  'kafka',
  'admin',
  'operator',
  'service',
] as const;

/** Allowed values for `entity.confidence` (user after-stats overrides and extracted metadata). */
export const ENTITY_CONFIDENCE = {
  High: 'high',
  Medium: 'medium',
} as const;

export type EntityConfidence = (typeof ENTITY_CONFIDENCE)[keyof typeof ENTITY_CONFIDENCE];
