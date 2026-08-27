/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EisInferenceEndpoint } from '../../common/types';
import { getModelId } from './get_model_id';

export const isModelUnavailableUnderRegionPolicy = (
  endpoints: EisInferenceEndpoint[],
  modelId: string
): boolean =>
  endpoints
    .filter((endpoint) => getModelId(endpoint) === modelId)
    .some((endpoint) => endpoint.metadata?.denied_by_region_policy === true);
