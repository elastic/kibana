/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KiVerifierRegistry } from './registry';
import { KiVerificationService } from './service';
import { createEsqlVerifier } from './verifiers/esql_verifier';

export type {
  KnowledgeItemCandidate,
  KiVerifierStatus,
  KiVerifierResult,
  KiVerifierContext,
  KiVerificationLogger,
  KiVerifier,
  KiVerificationSummary,
  KiVerificationVerdict,
} from './types';
export { KiVerifierRegistry } from './registry';
export { KiVerificationService } from './service';
export { createEsqlVerifier } from './verifiers/esql_verifier';

export const createKiVerificationService = (): KiVerificationService => {
  const registry = new KiVerifierRegistry();
  registry.register(createEsqlVerifier());
  return new KiVerificationService(registry);
};
