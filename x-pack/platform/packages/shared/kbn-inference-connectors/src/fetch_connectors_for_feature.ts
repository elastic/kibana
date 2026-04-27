/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { ApiInferenceConnector } from '@kbn/inference-common';
import {
  INFERENCE_CONNECTORS_INTERNAL_API_PATH,
  type InferenceConnectorsApiResponseBody,
} from '@kbn/inference-common';

export interface FetchConnectorsForFeatureResult {
  connectors: ApiInferenceConnector[];
  soEntryFound: boolean;
}

export const fetchConnectorsForFeature = async (
  http: HttpSetup,
  featureId: string
): Promise<FetchConnectorsForFeatureResult> => {
  const { connectors, soEntryFound } = await http.get<InferenceConnectorsApiResponseBody>(
    INFERENCE_CONNECTORS_INTERNAL_API_PATH,
    {
      query: { featureId },
      version: '1',
    }
  );

  return { connectors, soEntryFound };
};
