/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import type { BoostDataAge, BoostDataLifecycle, BoostDataSource } from '../../common/types';
import { SAMPLE_DATA_SIZES_GB, getSampleDataAges } from '../prototype/sample_sizes';
import { BoostRequestError } from './errors';

const BYTES_PER_GB = 1e9;
const MS_PER_HOUR = 3_600_000;

const isUserFacing = (name: string) => !name.startsWith('.');

/** Reads each index's dataset size, including data stream backing indices. */
const getDatasetSizes = async (client: ElasticsearchClient): Promise<Map<string, number>> => {
  // Serverless keeps data in object storage, so the local store size is always 0; the dataset size
  // is the data's full size.
  const { indices = {} } = await client.indices.stats({
    index: '*',
    metric: 'store',
    expand_wildcards: ['open', 'hidden'],
  });
  return new Map(
    Object.entries(indices).map(([name, { primaries }]): [string, number] => [
      name,
      primaries?.store?.total_data_set_size_in_bytes ?? primaries?.store?.size_in_bytes ?? 0,
    ])
  );
};

interface DataStreamDetails {
  /** Its backing indices, in order with the write index last. */
  backingIndices: string[];
  lifecycle?: BoostDataLifecycle;
}

/** Reads each data stream's backing indices and lifecycle. */
const getDataStreamDetails = async (
  client: ElasticsearchClient
): Promise<Map<string, DataStreamDetails>> => {
  const { data_streams: dataStreams } = await client.indices.getDataStream({
    name: '*',
    expand_wildcards: 'open',
  });
  return new Map(
    dataStreams.map(({ name, indices, lifecycle }): [string, DataStreamDetails] => {
      // The effective retention accounts for the project's default and maximum retention.
      const retention = lifecycle?.effective_retention ?? lifecycle?.data_retention;
      return [
        name,
        {
          backingIndices: indices.map(({ index_name: index }) => index),
          lifecycle: lifecycle && {
            enabled: lifecycle.enabled !== false,
            data_retention: typeof retention === 'string' ? retention : undefined,
          },
        },
      ];
    })
  );
};

/**
 * Reads when each rolled-over backing index stopped receiving data. The write index hasn't rolled
 * over, so its newest data is current. Data stream lifecycle ages backing indices the same way.
 */
const getRolloverTimes = async (client: ElasticsearchClient): Promise<Map<string, number>> => {
  const { indices } = await client.indices.explainDataLifecycle({ index: '.ds-*' });
  return new Map(
    Object.entries(indices ?? {}).flatMap(([name, { rollover_date_millis: rolloverTime }]) =>
      rolloverTime === undefined ? [] : [[name, Number(rolloverTime)]]
    )
  );
};

// Each part of a data stream's history is optional: without it, estimates assume less, not fail.
const orEmpty = <T>(promise: Promise<Map<string, T>>) => promise.catch(() => new Map<string, T>());

/**
 * Lists the project's open, non-hidden regular indices and data streams, with their sizes, and each
 * data stream's lifecycle and data by age. Data stream backing indices are excluded, since boost
 * rules apply to the data stream as a whole.
 */
export const getDataSources = async (client: ElasticsearchClient): Promise<BoostDataSource[]> => {
  const [{ indices, data_streams: dataStreams }, sizes, dataStreamDetails, rolloverTimes] =
    await Promise.all([
      client.indices.resolveIndex({ name: '*', expand_wildcards: 'open' }),
      orEmpty(getDatasetSizes(client)),
      orEmpty(getDataStreamDetails(client)),
      orEmpty(getRolloverTimes(client)),
    ]);
  const now = Date.now();

  const getDataAges = (name: string): BoostDataAge[] =>
    (dataStreamDetails.get(name)?.backingIndices ?? []).map((index) => {
      const rolloverTime = rolloverTimes.get(index);
      return {
        age_hours: rolloverTime === undefined ? 0 : Math.max(0, now - rolloverTime) / MS_PER_HOUR,
        size_in_bytes: sizes.get(index) ?? 0,
      };
    });

  // Prototype: sample data sources get illustrative sizes and history; see sample_sizes.ts.
  const getSampleSize = (name: string) =>
    name in SAMPLE_DATA_SIZES_GB ? SAMPLE_DATA_SIZES_GB[name] * BYTES_PER_GB : undefined;

  return [
    ...indices
      .filter(({ name, data_stream: dataStream }) => !dataStream && isUserFacing(name))
      .map(
        ({ name }): BoostDataSource => ({
          name,
          type: 'index',
          size_in_bytes: getSampleSize(name) ?? sizes.get(name) ?? 0,
        })
      ),
    ...dataStreams
      .filter(({ name }) => isUserFacing(name))
      .map(({ name }): BoostDataSource => {
        const sampleSize = getSampleSize(name);
        const dataAges =
          sampleSize === undefined ? getDataAges(name) : getSampleDataAges(sampleSize);
        return {
          name,
          type: 'data_stream',
          size_in_bytes: dataAges.reduce((total, { size_in_bytes: bytes }) => total + bytes, 0),
          lifecycle: dataStreamDetails.get(name)?.lifecycle,
          data_ages: dataAges,
        };
      }),
  ].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Finds what boost rules match for one index or data stream, as Elasticsearch resolves them: its
 * name and type, or a backing index's data stream. System indices match no rules, so they have
 * nothing to match by.
 */
export const resolveDataSource = async (
  client: ElasticsearchClient,
  name: string
): Promise<Pick<BoostDataSource, 'name' | 'type'> | undefined> => {
  if (/[*,]/.test(name)) {
    throw new BoostRequestError(400, `[${name}] must name one index or data stream`);
  }
  try {
    const {
      indices,
      aliases,
      data_streams: dataStreams,
    } = await client.indices.resolveIndex({ name, expand_wildcards: 'all' });
    if (dataStreams.some((dataStream) => dataStream.name === name)) {
      return { name, type: 'data_stream' };
    }
    const index = indices.find((item) => item.name === name);
    if (index) {
      if (index.attributes.includes('system')) {
        return undefined;
      }
      return index.data_stream
        ? { name: index.data_stream, type: 'data_stream' }
        : { name, type: 'index' };
    }
    if (aliases.some((alias) => alias.name === name)) {
      throw new BoostRequestError(400, `[${name}] is an alias, not an index or data stream`);
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }
  throw new BoostRequestError(404, `No such index or data stream [${name}]`);
};
