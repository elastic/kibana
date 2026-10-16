/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds Elasticsearch `_source` filtering for entity list/search requests.
 * Returns `_source: false` when `disableSource` is true (pair with `docValueFields`
 * to read from doc values without decompressing the stored source blob);
 * returns an include list when `sourceIncludes` is provided; otherwise returns
 * the full document source.
 */
export function buildEntityListSourceFilter(params: {
  sourceIncludes?: string[];
  disableSource?: boolean;
}): { _source?: string[] | false } {
  if (params.disableSource) return { _source: false };
  return params.sourceIncludes?.length ? { _source: params.sourceIncludes } : {};
}
