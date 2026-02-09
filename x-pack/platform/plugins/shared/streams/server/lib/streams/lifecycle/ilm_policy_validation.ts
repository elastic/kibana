/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPhases } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { StatusError } from '../errors/status_error';

export interface ExistingIlmPolicy {
  policy?: {
    phases?: IlmPhases;
    _meta?: Record<string, unknown>;
    deprecated?: boolean;
  };
}

/**
 * Fetches an existing ILM policy by name.
 * Returns `undefined` when the policy does not exist (404).
 */
export const getExistingPolicy = async (
  scopedClusterClient: IScopedClusterClient,
  name: string
): Promise<ExistingIlmPolicy | undefined> => {
  try {
    const policies = await scopedClusterClient.asCurrentUser.ilm.getLifecycle({ name });
    return policies[name];
  } catch (error) {
    // 404 is expected when the policy doesn't exist yet
    if (!isNotFoundError(error)) {
      throw error;
    }
    return undefined;
  }
};

/**
 * Validates that the policy name is valid. Throws a `StatusError` when:
 * - The policy already exists and `allowOverwrite` is `false`.
 */
export const assertPolicyNameIsValid = (
  existingPolicy: ExistingIlmPolicy | undefined,
  allowOverwrite: boolean
): void => {
  if (existingPolicy && !allowOverwrite) {
    throw new StatusError(
      'ILM policy already exists. Use "allow_overwrite=true" if you want to proceed',
      409
    );
  }
};

/**
 * Validates that the incoming policy phases are acceptable. Throws a
 * `StatusError` (400) when:
 *
 * - The policy has **no phases at all** (at least one is required).
 * - The `hot` phase is missing, unless:
 *   - **Updating** an existing policy that already has no `hot` phase.
 *   - **Creating** a new policy with `allowMissingHot` set to `true`.
 */
export const assertValidPolicyPhases = ({
  existingPolicy,
  incomingPhases,
  allowMissingHot,
}: {
  existingPolicy?: ExistingIlmPolicy;
  incomingPhases?: IlmPhases;
  allowMissingHot: boolean;
}): void => {
  const nonNullPhases = incomingPhases
    ? Object.entries(incomingPhases).filter(([, value]) => value != null)
    : [];

  if (nonNullPhases.length === 0) {
    throw new StatusError('Policy must have at least one phase', 400);
  }

  const incomingHasHot = nonNullPhases.some(([key]) => key === 'hot');

  if (incomingHasHot) {
    return;
  }

  const hasExistingPolicy = Boolean(existingPolicy);
  const existingAlreadyMissingHot = !Boolean(existingPolicy?.policy?.phases?.hot);

  // Updating: valid only when the original policy was already missing hot
  const isValidUpdate = hasExistingPolicy && existingAlreadyMissingHot;
  // New policy: valid only when explicitly opted in
  const isValidNewPolicy = !hasExistingPolicy && allowMissingHot;

  if (!isValidUpdate && !isValidNewPolicy) {
    throw new StatusError('Policy is missing a required hot phase', 400);
  }
};
