/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface LspRequest {
  method: string;
  params: any;
  documentUri?: string; // assert there is only one uri per request for now.
  resolvedFilePath?: string;
  workspacePath?: string;
  workspaceRevision?: string;
  isNotification?: boolean; // if this is a notification request that doesn't need response
  timeoutForInitializeMs?: number; // If the language server is initialize, how many milliseconds should we wait for it. Default infinite.
}
