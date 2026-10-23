/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import {
  resolveConnectorIdFromFeatures,
  type SearchInferenceEndpointsPluginStart,
} from '@kbn/search-inference-endpoints/server';
import { CONNECTOR_ID_BY_FEATURE_CONFLICT_MESSAGE_WORKFLOW } from '../../common/resolve_connector_or_inference_id';

export interface ResolveConnectorIdByFeatureParams {
  featureId: string;
  request: KibanaRequest;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}

/**
 * Resolves one feature id to a connector. A feature with no configured model
 * throws, rather than falling through to another connector source.
 */
export const resolveConnectorIdByFeature = async ({
  featureId,
  request,
  searchInferenceEndpoints,
}: ResolveConnectorIdByFeatureParams): Promise<string> => {
  const connectorId = await resolveConnectorIdFromFeatures({
    featureIds: [featureId],
    request,
    searchInferenceEndpoints,
    hasExplicitConnector: false,
    conflictMessage: CONNECTOR_ID_BY_FEATURE_CONFLICT_MESSAGE_WORKFLOW,
  });
  if (connectorId === undefined) {
    throw new Error(`No connector available for feature "${featureId}".`);
  }
  return connectorId;
};
