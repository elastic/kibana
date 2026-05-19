/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface GetFindFilterOpts {
  removalDelay: string;
  excludedSOIds?: string[];
  savedObjectType: string;
}
export declare function getFindFilter(opts: GetFindFilterOpts): string;
export {};
