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

const sec = 1_000;
const kB = 1024;

// Download (kb/s)	Upload (kb/s)	Latency (ms)
// https://gist.github.com/theodorosploumis/fd4086ee58369b68aea6b0782dc96a2e
export const NETWORK_PROFILES: { [key: string]: NetworkOptions } = {
  DEFAULT: { DOWNLOAD: 5 * kB * sec, UPLOAD: 1 * kB * sec, LATENCY: 0.1 * sec },
  GPRS: { DOWNLOAD: 0.05 * kB * sec, UPLOAD: 0.02 * kB * sec, LATENCY: 0.5 * sec },
  MOBILE_EDGE: { DOWNLOAD: 0.24 * kB * sec, UPLOAD: 0.2 * kB * sec, LATENCY: 0.84 * sec },
  '2G_REGULAR': { DOWNLOAD: 0.25 * kB * sec, UPLOAD: 0.05 * kB * sec, LATENCY: 0.3 * sec },
  '2G_GOOD': { DOWNLOAD: 0.45 * kB * sec, UPLOAD: 0.15 * kB * sec, LATENCY: 0.15 * sec },
  '3G_SLOW': { DOWNLOAD: 0.78 * kB * sec, UPLOAD: 0.33 * kB * sec, LATENCY: 0.2 * sec },
  '3G_REGULAR': { DOWNLOAD: 0.75 * kB * sec, UPLOAD: 0.25 * kB * sec, LATENCY: 0.1 * sec },
  '3G_GOOD': { DOWNLOAD: 1.5 * kB * sec, UPLOAD: 0.75 * kB * sec, LATENCY: 0.04 * sec },
  '4G_REGULAR': { DOWNLOAD: 4 * kB * sec, UPLOAD: 3 * kB * sec, LATENCY: 0.02 * sec },
  DSL: { DOWNLOAD: 2 * kB * sec, UPLOAD: 1 * kB * sec, LATENCY: 0.005 * sec },
  CABLE_5MBPS: { DOWNLOAD: 5 * kB * sec, UPLOAD: 1 * kB * sec, LATENCY: 0.28 * sec },
  CABLE_8MBPS: { DOWNLOAD: 8 * kB * sec, UPLOAD: 2 * kB * sec, LATENCY: 0.1 * sec },
  WIFI: { DOWNLOAD: 30 * kB * sec, UPLOAD: 15 * kB * sec, LATENCY: 0.002 * sec },
};
