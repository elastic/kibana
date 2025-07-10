/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesMetadataConfiguration } from './services/indices_metadata.types';
import type { CdnConfig } from './services/artifact.types';

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

export const INDICES_METADATA_CONFIGURATION_DEFAULTS: IndicesMetadataConfiguration = {
  datastreams_threshold: 0,
  ilm_policy_query_size: 0,
  ilm_stats_query_size: 0,
  index_query_size: 0,
  indices_settings_threshold: 0,
  indices_threshold: 0,
};
