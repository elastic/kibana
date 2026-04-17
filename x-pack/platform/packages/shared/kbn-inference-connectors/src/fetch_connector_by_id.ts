/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, HttpSetup } from '@kbn/core-http-browser';
import type { InferenceConnector } from '@kbn/inference-common';
import { toAIConnector } from './load_connectors';
import type { AIConnector } from './types';

export const fetchConnectorById = async (
  http: HttpSetup,
  connectorId: string
): Promise<AIConnector | undefined> => {
  try {
    const { connector } = await http.get<{ connector: InferenceConnector }>(
      `/internal/inference/connectors/${encodeURIComponent(connectorId)}`
    );
    return toAIConnector(connector);
  } catch (e) {
    if ((e as IHttpFetchError).response?.status === 404) {
      return undefined;
    }
    throw e;
  }
};
