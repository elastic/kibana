/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum DocumentationProduct {
  kibana = 'kibana',
  elasticsearch = 'elasticsearch',
  observability = 'observability',
  security = 'security',
}

export type ProductName = keyof typeof DocumentationProduct;
