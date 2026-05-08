/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

export interface ApiInferenceConnector extends InferenceConnector {
  isRecommended?: boolean;
}

/**
 * Produces the ordered connector list the UI consumes.
 *
 * - When `soEntryFound` is true, `featureEndpoints` are admin-configured SO overrides and
 *   take precedence; they are returned as-is (no recommended flag).
 * - When `soEntryFound` is false and `featureEndpoints` is non-empty, those are recommended
 *   endpoints. They are marked with `isRecommended: true`, listed first, then the remaining
 *   entries from `allConnectors` follow without duplicates.
 * - When `soEntryFound` is false and `featureEndpoints` is empty, the full catalog is
 *   returned with the platform default chat-completion endpoint moved to the front.
 */
export const mergeConnectors = (
  featureEndpoints: InferenceConnector[],
  allConnectors: InferenceConnector[],
  soEntryFound: boolean
): ApiInferenceConnector[] => {
  if (soEntryFound) {
    return featureEndpoints;
  }

  if (featureEndpoints.length > 0) {
    const recommendedIds = new Set(featureEndpoints.map((c) => c.connectorId));
    const recommended: ApiInferenceConnector[] = featureEndpoints.map((c) => ({
      ...c,
      isRecommended: true,
    }));
    const otherConnectors = allConnectors.filter((c) => !recommendedIds.has(c.connectorId));
    return [...recommended, ...otherConnectors];
  }

  const defaultId = defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION;
  const defaultIndex = allConnectors.findIndex((c) => c.connectorId === defaultId);
  if (defaultIndex > 0) {
    const reordered = [...allConnectors];
    const [defaultConnector] = reordered.splice(defaultIndex, 1);
    reordered.unshift(defaultConnector);
    return reordered;
  }

  return allConnectors;
};
