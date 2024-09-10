/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StorageResult } from '../../../../../../types';
import { FetchHistoricalResultsOpts } from '../../types';

export interface UseHistoricalResultsReturnValue {
  historicalResultsState: {
    results: StorageResult[];
    total: number;
    isLoading: boolean;
    error: Error | null;
  };
  fetchHistoricalResults: (opts: Omit<FetchHistoricalResultsOpts, 'httpFetch'>) => Promise<void>;
}
