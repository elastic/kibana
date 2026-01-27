/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Resource types for knowledge base artifacts.
 * - `product_doc`: Elastic product documentation (Kibana, Elasticsearch, etc.)
 * - `security_labs`: Elastic Security Labs content
 */
export type ResourceType = 'product_doc' | 'security_labs';

export const ResourceTypes = {
  productDoc: 'product_doc',
  securityLabs: 'security_labs',
} as const;
