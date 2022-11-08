/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface NetworkOptions {
  DOWNLOAD: number;
  UPLOAD: number;
  LATENCY: number;
}

const sec = 10 ** 3;
const MBps = 10 ** 6 / 8; // megabyte per second (MB/s) (can be abbreviated as MBps)

// Selenium uses B/s (bytes) for network throttling
// Download (B/s)	Upload (B/s) Latency (ms)
export const NETWORK_PROFILES: { [key: string]: NetworkOptions } = {
  CLOUD_USER: { DOWNLOAD: 6 * MBps, UPLOAD: 6 * MBps, LATENCY: 0.1 * sec },
};
