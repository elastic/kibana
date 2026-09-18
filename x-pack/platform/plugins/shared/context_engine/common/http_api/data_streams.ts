/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Response of the data streams search API. */
export interface SearchDataStreamsResponse {
  dataStreams: string[];
  /** True when more matches exist beyond the returned, capped list. */
  hasMore: boolean;
}
