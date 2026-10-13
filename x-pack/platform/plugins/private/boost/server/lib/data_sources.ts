/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BoostDataSource } from '../../common/types';
import { SAMPLE_DATA_SIZES_GB } from '../prototype/sample_sizes';

const BYTES_PER_GB = 1e9;

const isUserFacing = (name: string) => !name.startsWith('.');

/** Reads stored sizes, or an empty map if the user can't read stats. */
const getStoredSizes = async (client: ElasticsearchClient): Promise<Map<string, number>> => {
  try {
    const [{ indices = {} }, { data_streams: dataStreams }] = await Promise.all([
      client.indices.stats({ index: '*', metric: 'store', expand_wildcards: 'open' }),
      client.indices.dataStreamsStats({ name: '*' }),
    ]);
    return new Map([
      ...Object.entries(indices).map(([name, stats]): [string, number] => [
        name,
        stats.primaries?.store?.size_in_bytes ?? 0,
      ]),
      ...dataStreams.map(({ data_stream: name, store_size_bytes: bytes }): [string, number] => [
        name,
        bytes,
      ]),
    ]);
  } catch {
    return new Map();
  }
};

/**
 * Lists the project's open, non-hidden regular indices and data streams, with their sizes. Data
 * stream backing indices are excluded, since boost rules apply to the data stream as a whole.
 */
export const getDataSources = async (client: ElasticsearchClient): Promise<BoostDataSource[]> => {
  const [{ indices, data_streams: dataStreams }, storedSizes] = await Promise.all([
    client.indices.resolveIndex({ name: '*', expand_wildcards: 'open' }),
    getStoredSizes(client),
  ]);
  // Prototype: sample data sources get illustrative sizes; see SAMPLE_DATA_SIZES_GB.
  const getSize = (name: string) =>
    name in SAMPLE_DATA_SIZES_GB
      ? SAMPLE_DATA_SIZES_GB[name] * BYTES_PER_GB
      : storedSizes.get(name) ?? 0;

  return [
    ...indices
      .filter(({ name, data_stream: dataStream }) => !dataStream && isUserFacing(name))
      .map(({ name }): BoostDataSource => ({ name, type: 'index', size_in_bytes: getSize(name) })),
    ...dataStreams
      .filter(({ name }) => isUserFacing(name))
      .map(
        ({ name }): BoostDataSource => ({
          name,
          type: 'data_stream',
          size_in_bytes: getSize(name),
        })
      ),
  ].sort((a, b) => a.name.localeCompare(b.name));
};
