/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export const inferenceEndpointExists = async (
  esClient: ElasticsearchClient,
  inferenceEndpointId: string
) => {
  try {
    await esClient.inference.get({ inference_id: inferenceEndpointId });
    return true;
  } catch (err) {
    if (err?.statusCode === 404) {
      return false;
    } else {
      throw err;
    }
  }
};
