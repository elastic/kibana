/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

export function getElserInferenceId(isServerless: boolean): string {
  return isServerless
    ? defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID
    : defaultInferenceEndpoints.ELSER;
}

export async function checkInferenceAvailability(
  esClient: ElasticsearchClient,
  inferenceEndpointId: string
): Promise<boolean> {
  try {
    await esClient.inference.get({ inference_id: inferenceEndpointId });
    return true;
  } catch (error) {
    return false;
  }
}
