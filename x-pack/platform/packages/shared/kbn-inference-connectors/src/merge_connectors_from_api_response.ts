/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

/**
 * Turns the internal inference-connectors API payload into the ordered list the UI consumes.
 *
 * When `soEntryFound` is true, `connectors` are admin-configured SO overrides and take
 * precedence — they are returned as-is.
 *
 * When `soEntryFound` is false and `connectors` is non-empty, those are recommended
 * endpoints. They are listed first; remaining entries from `allConnectors` follow
 * without duplicates.
 *
 * When `soEntryFound` is false and `connectors` is empty, the full catalog is returned
 * with the platform default chat-completion endpoint moved to the front.
 */
export const mergeConnectorsFromApiResponse = (
  connectors: InferenceConnector[],
  allConnectors: InferenceConnector[],
  soEntryFound: boolean
): InferenceConnector[] => {
  if (soEntryFound) {
    return connectors;
  }

  if (connectors.length > 0) {
    const recommendedIds = new Set(connectors.map((c) => c.connectorId));
    const otherConnectors = allConnectors.filter((c) => !recommendedIds.has(c.connectorId));
    return [...connectors, ...otherConnectors];
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
