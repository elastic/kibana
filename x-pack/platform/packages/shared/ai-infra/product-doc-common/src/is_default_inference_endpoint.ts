/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';

/**
 * Returns true if inferenceId is not provided, or when provided, it is a default ELSER inference ID
 * @param inferenceId
 * @returns
 */
export const isImpliedDefaultElserInferenceId = (inferenceId: string | null | undefined) => {
  return (
    inferenceId === null ||
    inferenceId === undefined ||
    inferenceId === defaultInferenceEndpoints.ELSER ||
    inferenceId === defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID ||
    (typeof inferenceId === 'string' && inferenceId.toLowerCase().includes('elser'))
  );
};
