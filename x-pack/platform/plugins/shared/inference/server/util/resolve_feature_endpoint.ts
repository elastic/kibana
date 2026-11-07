/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInferenceInternalError,
  createInferenceRequestAbortedError,
  createInferenceRequestError,
} from '@kbn/inference-common';
import type { ScopedFeatureEndpointResolver } from '../types';

/**
 * The options a feature's top endpoint resolved to.
 */
export type ResolvedFeatureEndpoint = NonNullable<
  Awaited<ReturnType<ScopedFeatureEndpointResolver>>
>;

/**
 * Resolves the top endpoint of a feature, throwing an inference error when it cannot be resolved.
 */
export const resolveFeatureEndpointOrThrow = async ({
  featureId,
  resolveFeatureEndpoint,
  abortSignal,
}: {
  featureId: string;
  resolveFeatureEndpoint?: ScopedFeatureEndpointResolver;
  abortSignal?: AbortSignal;
}): Promise<ResolvedFeatureEndpoint> => {
  if (!resolveFeatureEndpoint) {
    throw createInferenceInternalError(
      `Cannot resolve feature "${featureId}": no feature endpoint resolver is registered`
    );
  }
  // Skips the resolver call for an already-aborted request; callers handle later aborts.
  if (abortSignal?.aborted) {
    throw createInferenceRequestAbortedError();
  }
  const endpoint = await resolveFeatureEndpoint(featureId);
  if (!endpoint) {
    throw createInferenceRequestError(
      `No endpoint is available for feature "${featureId}". Check the feature's model settings and the default AI connector settings.`,
      400
    );
  }
  return endpoint;
};
