/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TASK_TYPE = 'OtelTelemetryCollection:OtelPerServiceTask';
export const TASK_ID = 'otel-telemetry-collection:otel-per-service-task:1.0.0';

export const SIGNAL_INDICES = {
  traces: 'traces-*.otel-*',
  metrics: 'metrics-*.otel-*',
  logs: 'logs-*.otel-*',
} as const;

export type SignalType = keyof typeof SIGNAL_INDICES;

export const DEFAULT_CDN_CONFIG: CdnConfig = {
  url: 'https://artifacts.security.elastic.co',
  pubKey: `
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA6AB2sJ5M1ImN/bkQ7Te6
uI7vMXjN2yupEmh2rYz4gNzWS351d4JOhuQH3nzxfKdayHgusP/Kq2MXVqALH8Ru
Yu2AF08GdvYlQXPgEVI+tB/riekwU7PXZHdA1dY5/mEZ8SUSM25kcDJ3vTCzFTlL
gl2RNAdkR80d9nhvNSWlhWMwr8coQkr6NmujVU/Wa0w0EXbN1arjcG4qzbOCaR+b
cgQ9LRUoFfK9w+JJHDNjOI7rOmaIDA6Ep4oeDLy5AcGCE8bNmQzxZhRW7NvlNUGS
NTgU0CZTatVsL9AyP15W3k635Cpmy2SMPX+d/CFgvr8QPxtqdrz3q9iOeU3a1LMY
gDcFVmSzn5zieQEPfo/FcQID/gnCmkX0ADVMf1Q20ew66H7UCOejGaerbFZXYnTz
5AgQBWF2taOSSE7gDjGAHereeKp+1PR+tCkoDZIrPEjo0V6+KaTMuYS3oZj1/RZN
oTjQrdfeDj02mEIL+XkcWKAp03PYlWylVwgTMa178DDVuTWtS5lZL8j5LijlH9+6
xH8o++ghwfxp6ENLKDZPV5IvHHG7Vth9HScoPTQWQ+s8Bt26QENPUV2AbyxbJykY
mJfTDke3bEemHZzRbAmwiQ7VpJjJ4OfLGRy8Pp2AHo8kYIvWyM5+aLMxcxUaYdA9
5SxoDOgcDBA4lLb6XFLYiDUCAwEAAQ==
-----END PUBLIC KEY-----
`,
  requestTimeout: 10_000,
};

export interface CdnConfig {
  url: string;
  pubKey: string;
  requestTimeout: number;
}

export const TERMS_AGG_SIZE = 5;
export const SAMPLER_SHARD_SIZE = 200;
export const SAMPLER_MAX_DOCS_PER_VALUE = 3;
export const SCOPE_NAMES_AGG_SIZE = 100;

export const TASK_INTERVAL = '24h';
export const TASK_TIMEOUT = '10m';

export interface OtelTelemetryConfiguration {
  enabled: boolean;
  query_window: string;
  query_timeout: string;
  max_elements_per_event: number;
  composite_page_size: number;
  max_total_buckets: number;
}

export const DEFAULT_OTEL_TELEMETRY_CONFIGURATION: OtelTelemetryConfiguration = {
  enabled: true,
  query_window: '1h',
  query_timeout: '5m',
  max_elements_per_event: 5000,
  composite_page_size: 1000,
  max_total_buckets: 50_000,
};
