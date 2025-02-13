/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'fleet-package-policies';

export const PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES = ['auto_configure', 'create_doc'];

export const inputsFormat = {
  Simplified: 'simplified',
  Legacy: 'legacy',
} as const;

export const LICENCE_FOR_MULTIPLE_AGENT_POLICIES = 'enterprise';
