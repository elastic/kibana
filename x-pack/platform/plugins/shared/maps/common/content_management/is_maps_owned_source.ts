/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '../constants';

// Sources with a maps-defined as-code schema. Only these get snake_case/camelCase key conversion.
// Sources owned by other plugins (ML_ANOMALIES, TABLE_SOURCE, GEOJSON_FILE) are passed through as stored.
const MAPS_OWNED_SOURCE_TYPES: string[] = [
  SOURCE_TYPES.EMS_FILE,
  SOURCE_TYPES.EMS_TMS,
  SOURCE_TYPES.EMS_XYZ,
  SOURCE_TYPES.ES_GEO_GRID,
  SOURCE_TYPES.ES_GEO_LINE,
  SOURCE_TYPES.ES_PEW_PEW,
  SOURCE_TYPES.ES_SEARCH,
  SOURCE_TYPES.ESQL,
  SOURCE_TYPES.KIBANA_TILEMAP,
  SOURCE_TYPES.MVT_SINGLE_LAYER,
  SOURCE_TYPES.WMS,
  SOURCE_TYPES.ES_DISTANCE_SOURCE,
  SOURCE_TYPES.ES_TERM_SOURCE,
];

export function isMapsOwnedSource(source: unknown): boolean {
  const type = (source as { type?: unknown } | null | undefined)?.type;
  return typeof type === 'string' && MAPS_OWNED_SOURCE_TYPES.includes(type);
}
