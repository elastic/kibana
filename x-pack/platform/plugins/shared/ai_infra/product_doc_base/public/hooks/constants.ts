/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * React Query keys for product documentation queries and mutations
 */
export const REACT_QUERY_KEYS = {
  GET_PRODUCT_DOC_STATUS: 'productDocBase.status',
  INSTALL_PRODUCT_DOC: 'productDocBase.install',
  UNINSTALL_PRODUCT_DOC: 'productDocBase.uninstall',
} as const;
