/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ArtifactStore {
  has(key: string): Promise<boolean>;
  getCacheStream(key: string): NodeJS.ReadableStream;
  setCacheStream(key: string): Promise<NodeJS.WritableStream>;
  deleteCache(key: string): Promise<void>;
}
