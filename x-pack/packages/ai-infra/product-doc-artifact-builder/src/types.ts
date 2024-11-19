/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductName } from '@kbn/product-doc-common';

export interface TaskConfig {
  productNames: ProductName[];
  stackVersion: string;
  buildFolder: string;
  targetFolder: string;
  sourceClusterUrl: string;
  sourceClusterUsername: string;
  sourceClusterPassword: string;
  embeddingClusterUrl: string;
  embeddingClusterUsername: string;
  embeddingClusterPassword: string;
}
