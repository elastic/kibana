/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface GetDefaultCapacityOpts {
  autoCalculateDefaultEchCapacity: boolean;
  claimStrategy?: string;
  heapSizeLimit: number;
  isCloud: boolean;
  isServerless: boolean;
  isBackgroundTaskNodeOnly: boolean;
}
export declare function getDefaultCapacity({
  autoCalculateDefaultEchCapacity,
  claimStrategy,
  heapSizeLimit: heapSizeLimitInBytes,
  isCloud,
  isServerless,
  isBackgroundTaskNodeOnly,
}: GetDefaultCapacityOpts): number;
export {};
