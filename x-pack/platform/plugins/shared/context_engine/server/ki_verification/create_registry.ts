/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KiVerifierRegistry } from './registry';
import { createEsqlValidRuntimeVerifier, createEsqlValidSyntaxVerifier } from './verifiers';

/** Creates a registry with all built-in KI verifiers registered. */
export const createKiVerifierRegistry = (): KiVerifierRegistry => {
  const registry = new KiVerifierRegistry();
  registry.register(createEsqlValidSyntaxVerifier());
  registry.register(createEsqlValidRuntimeVerifier());
  return registry;
};
