/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesSetup, FilesStart } from '@kbn/files-plugin/server';

export interface FilesExamplePluginsSetup {
  files: FilesSetup;
}

export interface FilesExamplePluginsStart {
  files: FilesStart;
}
