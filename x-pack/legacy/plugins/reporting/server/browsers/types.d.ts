/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type BrowserType = 'chromium';

export interface BrowserDownload {
  paths: {
    archivesPath: string;
    baseUrl: string;
    packages: Array<{
      archiveChecksum: string;
      archiveFilename: string;
      binaryChecksum: string;
      binaryRelativePath: string;
      platforms: string[];
    }>;
  };
}
