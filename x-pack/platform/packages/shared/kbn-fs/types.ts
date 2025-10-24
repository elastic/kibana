/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Stream } from 'stream';

export type WriteFileContent =
  | string
  | NodeJS.ArrayBufferView
  | Iterable<string | NodeJS.ArrayBufferView>
  | AsyncIterable<string | NodeJS.ArrayBufferView>
  | Stream;

export interface WriteFileOptions {
  // When true, allows overwriting an existing file at the same path.
  override?: boolean;

  // Specifies a sub-directory (sub-volume) within the base data directory to help in organizing files, e.g., 'reports', 'exports'.
  volume?: string;
}

export interface FileMetadata {
  // A unique identifier for the file, combining volume type and sanitized name. e.g., 'disk:reports/my-report.csv'
  alias: string;
  // The full path to the file, either on disk or in the virtual filesystem.
  path: string;
}
