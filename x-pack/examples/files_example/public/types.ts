/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MyImageMetadata } from '../common';
import type { FilesSetup, FilesStart, ScopedFilesClient, FilesClient } from './imports';

export interface FilesExamplePluginsSetup {
  files: FilesSetup;
}

export interface FilesExamplePluginsStart {
  files: FilesStart;
}

export interface FileClients {
  unscoped: FilesClient<MyImageMetadata>;
  // Example file kind
  example: ScopedFilesClient<MyImageMetadata>;
}

export interface AppPluginStartDependencies {
  files: FileClients;
}
