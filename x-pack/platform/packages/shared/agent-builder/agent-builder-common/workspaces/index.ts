/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Content of a single workspace file, decoded to UTF-8. */
export interface WorkspaceFileContent {
  path: string;
  content: string;
}
