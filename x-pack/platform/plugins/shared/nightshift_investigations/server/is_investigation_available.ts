/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID } from '@kbn/significant-events-schema';

export const isInvestigationAvailable = async ({
  request,
  searchInferenceEndpoints,
}: {
  request: KibanaRequest;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
}): Promise<boolean> => {
  if (!searchInferenceEndpoints) {
    return false;
  }

  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
    SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
    request
  );
  return endpoints.length > 0;
};
