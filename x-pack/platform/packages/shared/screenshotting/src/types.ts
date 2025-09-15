/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFilesClient as FilesClient } from '@kbn/shared-ux-file-types';

export interface CaptureScreenshotOptions {
  timeout?: number;
  stableFor?: number;
}

export interface CaptureResult {
  image: string;
  blob: Blob;
}

interface SaveScreenshotDeps {
  filesClient?: FilesClient;
}

export interface SaveScreenshotOptions {
  save: boolean;
  caseId: string;
  owner: string;
  appName?: string;
  pageName?: string;
  dependencies?: SaveScreenshotDeps;
}

export interface ScreenshotUploadSuccess {
  ok: true;
  size: number;
  fileId: string;
}

export const FILE_KIND_DELIMITER = 'FilesCases';
