/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { getErrorMessage } from '../utils';
import { getDestinationInfo } from './reindex';

type Properties = Record<string, MappingProperty>;

/**
 * Creates each destination data stream and copies the time-series metric fields of its restored
 * indices onto it. Reindexing re-derives every other field type from the documents, but whether a
 * number is a counter, a gauge or a histogram was declared by the original writer and is not in the data.
 */
export async function copySourceMappings({
  esClient,
  log,
  restoredIndices,
  originalIndices,
}: {
  esClient: Client;
  log: ToolingLog;
  restoredIndices: string[];
  originalIndices: string[];
}): Promise<void> {
  const sourcesByDestination = new Map<string, string[]>();
  restoredIndices.forEach((restored, i) => {
    const { destIndex, isDataStream } = getDestinationInfo(originalIndices[i]);
    if (!isDataStream) {
      return;
    }
    sourcesByDestination.set(destIndex, [...(sourcesByDestination.get(destIndex) ?? []), restored]);
  });

  for (const [dataStream, sources] of sourcesByDestination) {
    await ensureDataStream({ esClient, log, dataStream });
    for (const source of sources) {
      const response = await esClient.indices.getMapping({ index: source });
      const properties = metricProperties(response[source]?.mappings?.properties ?? {});
      if (Object.keys(properties).length === 0) {
        continue;
      }
      log.debug(`Copying metric mappings from ${source} to ${dataStream}`);
      try {
        await esClient.indices.putMapping({ index: dataStream, properties });
      } catch (error) {
        throw new Error(
          `Failed to copy mappings from ${source} to ${dataStream}: ${getErrorMessage(error)}`
        );
      }
    }
  }
}

/** Fields with a `time_series_metric` declaration, kept inside their parent objects. */
export function metricProperties(properties: Properties): Properties {
  const kept: Properties = {};
  for (const [name, property] of Object.entries(properties)) {
    if ('properties' in property && property.properties) {
      const nested = metricProperties(property.properties as Properties);
      if (Object.keys(nested).length > 0) {
        kept[name] = { ...property, properties: nested } as MappingProperty;
      }
    } else if ('time_series_metric' in property) {
      kept[name] = property;
    }
  }
  return kept;
}

async function ensureDataStream({
  esClient,
  log,
  dataStream,
}: {
  esClient: Client;
  log: ToolingLog;
  dataStream: string;
}): Promise<void> {
  try {
    await esClient.indices.createDataStream({ name: dataStream });
    log.debug(`Created data stream ${dataStream}`);
  } catch (error) {
    if (getErrorMessage(error).includes('resource_already_exists_exception')) {
      return;
    }
    throw error;
  }
}
