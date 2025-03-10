/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';

export const isInferenceEndpointExists = async (
  http: HttpSetup,
  inferenceEndpointId: string
): Promise<boolean> => {
  try {
    return (
      await http.get<{ isEndpointExists: boolean }>(
        `/internal/_inference/_exists/${inferenceEndpointId}`,
        {
          version: '1',
        }
      )
    ).isEndpointExists;
  } catch (err) {
    return false;
  }
};
