/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface InferenceConnectorProviderConfig {
  [key: string]: unknown;
  max_number_of_allocations?: number;
  adaptive_allocations?: { max_number_of_allocations?: number };
}
