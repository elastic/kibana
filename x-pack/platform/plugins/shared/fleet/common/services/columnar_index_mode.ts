/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryDataStream, RegistryElasticsearch } from '../types';

/**
 * Index modes that belong to the columnar family. `columnar` is the base mode; `logsdb_columnar`
 * adds the logs profile on top of it.
 */
export const COLUMNAR_INDEX_MODES = ['logsdb_columnar', 'columnar'] as const;

export function isColumnarIndexMode(indexMode?: string): boolean {
  return (COLUMNAR_INDEX_MODES as readonly string[]).includes(indexMode ?? '');
}

/**
 * A data stream may be switched to a columnar index mode only when the package has declared that
 * it is ready for it, either explicitly through the stream-level readiness flag
 * (`elasticsearch.columnar.supported: true`, package-spec 3.7.0) or implicitly by already
 * declaring a columnar `elasticsearch.index_mode`.
 */
export function isColumnarEligible(
  registryDataStream?: { elasticsearch?: RegistryElasticsearch } | RegistryDataStream
): boolean {
  const elasticsearch = registryDataStream?.elasticsearch;

  return (
    elasticsearch?.columnar?.supported === true || isColumnarIndexMode(elasticsearch?.index_mode)
  );
}
