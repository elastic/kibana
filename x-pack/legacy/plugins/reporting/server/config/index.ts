/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkPolicy } from '../../types';

type BrowserType = 'chromium';

interface BrowserConfig {
  inspect: boolean;
  userDataDir: string;
  viewport: { width: number; height: number };
  disableSandbox: boolean;
  proxy: {
    enabled: boolean;
    server?: string;
    bypass?: string[];
  };
}

interface CaptureConfig {
  browser: {
    type: BrowserType;
    autoDownload: boolean;
    chromium: BrowserConfig;
  };
  maxAttempts: number;
  networkPolicy: NetworkPolicy;
  loadDelay: number;
  timeouts: {
    openUrl: number;
    waitForElements: number;
    renderComplete: number;
  };
  viewport: any;
  zoom: any;
}

interface QueueConfig {
  indexInterval: string;
  pollEnabled: boolean;
  pollInterval: number;
  pollIntervalErrorMultiplier: number;
  timeout: number;
}

interface ScrollConfig {
  duration: string;
  size: number;
}

export interface ReportingConfigType {
  capture: CaptureConfig;
  csv: {
    scroll: ScrollConfig;
    enablePanelActionDownload: boolean;
    checkForFormulas: boolean;
    maxSizeBytes: number;
  };
  encryptionKey: string;
  kibanaServer: any;
  index: string;
  queue: QueueConfig;
  roles: any;
}
