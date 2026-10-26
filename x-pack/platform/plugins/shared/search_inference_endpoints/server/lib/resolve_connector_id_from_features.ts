/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '../types';

/**
 * Drops blank entries from a `connector-id-by-feature` value. A string and a list
 * are both accepted so a step can name one feature or a priority list, and a
 * templated entry that renders blank is ignored.
 */
export const normalizeConnectorFeatureIds = (value: unknown): string[] => {
  const entries = Array.isArray(value) ? value : [value];
  const ids: string[] = [];
  for (const entry of entries) {
    if (typeof entry !== 'string') {
      continue;
    }
    const trimmed = entry.trim();
    if (trimmed.length > 0) {
      ids.push(trimmed);
    }
  }
  return ids;
};

/**
 * Resolves the first configured connector from an ordered feature list.
 *
 * Each id is asked only for what an operator configured (`onlyReturnConfigured`).
 * A miss continues to the next id. An id that is not registered is skipped the
 * same way: AlertZero ships disabled, and a workflow installed by another
 * plugin must not treat that missing row as a configured feature. A list where
 * every entry misses is not a conflict with an explicit connector id, so the
 * caller can use `connector-id` or its default. A listed feature that does
 * resolve a connector conflicts with an explicit connector id.
 */
export const resolveConnectorIdFromFeatures = async ({
  featureIds,
  request,
  searchInferenceEndpoints,
  hasExplicitConnector,
  conflictMessage,
}: {
  featureIds: readonly string[];
  request: KibanaRequest;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  hasExplicitConnector: boolean;
  conflictMessage: string;
}): Promise<string | undefined> => {
  for (const featureId of featureIds) {
    const feature = searchInferenceEndpoints.features.get(featureId);
    // Unregistered ids are optional. `features.get` is undefined when the
    // owning plugin is disabled, and treating that as a configured feature
    // conflicts with a standalone `connector-id`.
    if (feature == null) {
      continue;
    }

    if (feature.taskType !== 'chat_completion') {
      throw new Error(
        `Feature "${featureId}" is not a chat completion feature (task type "${feature.taskType}"). connector-id-by-feature requires a feature with task type "chat_completion".`
      );
    }

    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      featureId,
      request,
      { onlyReturnConfigured: true }
    );
    if (endpoints.length === 0) {
      continue;
    }

    if (hasExplicitConnector) {
      throw new Error(conflictMessage);
    }

    return endpoints[0].connectorId;
  }

  return undefined;
};
