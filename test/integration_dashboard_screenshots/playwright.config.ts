/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx);
        const value = trimmed.slice(eqIdx + 1);
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  outputDir: path.resolve(__dirname, '.test-artifacts'),
  snapshotPathTemplate: 'screenshots/{arg}-{platform}{ext}',
  preserveOutput: 'failures-only',
  expect: {
    timeout: 30_000,
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: 'disabled',
    },
  },
  fullyParallel: true,
  timeout: 120_000,
  retries: 1,
  workers: parseInt(process.env.PW_WORKERS || '4', 10),
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  use: {
    baseURL: (process.env.KIBANA_URL || 'http://localhost:5601').replace(/\/?$/, '/'),
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
    testIdAttribute: 'data-test-subj',
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.resolve(__dirname, '.report') }],
  ],
});
