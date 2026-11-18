/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { flattenObject } from '@kbn/object-utils';
import { parseEpisodeDataJson } from '@kbn/alerting-v2-utils';

const EPISODE_DATA_FIELD = 'episode_data';
const DATA_FIELD_PREFIX = 'data';

/**
 * Replaces the `episode_data` JSON string of an episode row with one `data.*` field per value,
 * so a document table shows each value in its own row.
 */
export const withFlattenedEpisodeData = (hit: DataTableRecord): DataTableRecord => {
  if (!(EPISODE_DATA_FIELD in hit.flattened)) return hit;
  const { [EPISODE_DATA_FIELD]: rawData, ...fields } = hit.flattened;
  const dataFields = flattenObject(parseEpisodeDataJson(rawData), DATA_FIELD_PREFIX);
  return { ...hit, flattened: { ...fields, ...dataFields } };
};
