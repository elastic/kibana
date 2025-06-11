/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlNodeCountOptions, MlNodeCountResponse } from './types';

/**
 * Interface for ML node utilities
 */
export interface NodeUtilitiesInterface {
  /**
   * Get the count of ML nodes
   * @param options Options for getting ML node count
   */
  getMlNodeCount(options: MlNodeCountOptions): Promise<MlNodeCountResponse>;

  /**
   * Check if at least one ML node exists
   * @param options Options for checking ML nodes
   */
  mlNodesExist(options: MlNodeCountOptions): Promise<boolean>;
}
