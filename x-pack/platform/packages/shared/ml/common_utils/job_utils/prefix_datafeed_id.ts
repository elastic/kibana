/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// add a prefix to a datafeed id before the "datafeed-" part of the name
export function prefixDatafeedId(datafeedId: string, prefix: string): string {
  return datafeedId.match(/^datafeed-/)
    ? datafeedId.replace(/^datafeed-/, `datafeed-${prefix}`)
    : `datafeed-${prefix}${datafeedId}`;
}
