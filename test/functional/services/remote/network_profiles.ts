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

// Download (kb/s)	Upload (kb/s)	Latency (ms)
// https://gist.github.com/theodorosploumis/fd4086ee58369b68aea6b0782dc96a2e
export const NETWORK_PROFILES: { [key: string]: NetworkOptions } = {
  DEFAULT: { DOWNLOAD: 5000 * 1024, UPLOAD: 1000 * 1024, LATENCY: 100 },
  GPRS: { DOWNLOAD: 50 * 1024, UPLOAD: 20 * 1024, LATENCY: 500 },
  MOBILE_EDGE: { DOWNLOAD: 240 * 1024, UPLOAD: 200 * 1024, LATENCY: 840 },
  '2G_REGULAR': { DOWNLOAD: 250 * 1024, UPLOAD: 50 * 1024, LATENCY: 300 },
  '2G_GOOD': { DOWNLOAD: 450 * 1024, UPLOAD: 150 * 1024, LATENCY: 150 },
  '3G_SLOW': { DOWNLOAD: 780 * 1024, UPLOAD: 330 * 1024, LATENCY: 200 },
  '3G_REGULAR': { DOWNLOAD: 750 * 1024, UPLOAD: 250 * 1024, LATENCY: 100 },
  '3G_GOOD': { DOWNLOAD: 1500 * 1024, UPLOAD: 750 * 1024, LATENCY: 40 },
  '4G_REGULAR': { DOWNLOAD: 4000 * 1024, UPLOAD: 3000 * 1024, LATENCY: 20 },
  DSL: { DOWNLOAD: 2000 * 1024, UPLOAD: 1000 * 1024, LATENCY: 5 },
  CABLE_5MBPS: { DOWNLOAD: 5000 * 1024, UPLOAD: 1000 * 1024, LATENCY: 28 },
  CABLE_8MBPS: { DOWNLOAD: 8000 * 1024, UPLOAD: 2000 * 1024, LATENCY: 10 },
  WIFI: { DOWNLOAD: 30000 * 1024, UPLOAD: 15000 * 1024, LATENCY: 2 },
};
