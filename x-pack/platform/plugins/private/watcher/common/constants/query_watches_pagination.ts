/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const QUERY_WATCHES_PAGINATION: {
  PAGE_SIZE: number;
  MAX_RESULT_WINDOW: number;
} = {
  // How many watches to return per response
  // Page size of 500 balances performance and safety, allowing up to 20 pages before hitting the 10,000 limit
  PAGE_SIZE: 500,
  // The Query Watch API doesn't allow the sum of `form` and `size` params to exceed 10000.
  // Therefore, the maximum number of watches that we can fetch is 10000
  MAX_RESULT_WINDOW: 10000,
};
