/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '../types';
import { resolveExplicitFeatureConnectorId } from './resolve_explicit_feature_connector';

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
 * Resolves the first usable connector from an ordered feature list.
 *
 * A feature with `ownEntryOnly` contributes a connector only when an operator
 * saved one on that row. A miss continues to the next id and does not conflict
 * with an explicit connector id. Any other feature is resolved in full (saved
 * model, parent chain, recommended endpoints, then the platform default) and
 * conflicts with an explicit connector id. An unregistered id takes that full
 * path. Returns undefined when every id misses, so the caller can use
 * `connector-id` or its default.
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
    if (feature?.ownEntryOnly) {
      const connectorId = await resolveExplicitFeatureConnectorId({
        featureId,
        request,
        searchInferenceEndpoints,
      });
      if (connectorId) {
        return connectorId;
      }
      continue;
    }

    if (hasExplicitConnector) {
      throw new Error(conflictMessage);
    }

    if (feature && feature.taskType !== 'chat_completion') {
      throw new Error(
        `Feature "${featureId}" is not a chat completion feature (task type "${feature.taskType}"). connector-id-by-feature requires a feature with task type "chat_completion".`
      );
    }

    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      featureId,
      request
    );
    if (endpoints.length === 0) {
      throw new Error(`No connector available for feature "${featureId}".`);
    }
    return endpoints[0].connectorId;
  }

  return undefined;
};
