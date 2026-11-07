/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@kbn/react-query';

let queryClient: QueryClient | undefined;

/** One cache for every bridge piece on the case view, so they share each investigation read. */
export const getBridgeQueryClient = (): QueryClient => {
  if (!queryClient) {
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000 } } });
  }
  return queryClient;
};
