/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundOutputAPI, BoundOptions, OutputAPI } from '@kbn/inference-common';
import { bindApi } from '@kbn/inference-common';

/**
 * Bind output to the provided parameters,
 * returning a bound version of the API.
 */
export function bindOutput(outputApi: OutputAPI, boundParams: BoundOptions): BoundOutputAPI;

export function bindOutput(outputApi: OutputAPI, boundParams: BoundOptions) {
  return bindApi(outputApi, boundParams);
}
