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
 * A stream that cannot be created or updated is reported and left to the reindex, which then maps it
 * dynamically as before.
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
    if (!(await ensureDataStream({ esClient, log, dataStream }))) {
      continue;
    }
    const applied = new Set<string>();
    for (const source of sources) {
      const response = await esClient.indices.getMapping({ index: source });
      const properties = metricProperties(response[source]?.mappings?.properties ?? {});
      const key = JSON.stringify(properties);
      if (Object.keys(properties).length === 0 || applied.has(key)) {
        continue;
      }
      applied.add(key);
      log.debug(`Copying metric mappings from ${source} to ${dataStream}`);
      try {
        await esClient.indices.putMapping({ index: dataStream, properties });
      } catch (error) {
        log.warning(
          `Could not copy metric mappings from ${source} to ${dataStream}; its metric fields will be mapped dynamically: ${getErrorMessage(
            error
          )}`
        );
        break;
      }
    }
  }
}

/**
 * Fields with a `time_series_metric` declaration, kept inside their parent objects. A parent keeps only
 * its type, its children and, for passthrough objects, the `priority` Elasticsearch requires to create one.
 */
export function metricProperties(properties: Properties): Properties {
  const kept: Properties = {};
  for (const [name, property] of Object.entries(properties)) {
    if ('properties' in property && property.properties) {
      const nested = metricProperties(property.properties as Properties);
      if (Object.keys(nested).length > 0) {
        const { type, priority } = property as { type?: string; priority?: number };
        kept[name] = {
          ...(type ? { type } : {}),
          ...(priority !== undefined ? { priority } : {}),
          properties: nested,
        } as MappingProperty;
      }
    } else if ('time_series_metric' in property) {
      kept[name] = property;
    }
  }
  return kept;
}

/** True when the data stream exists or was created; false (with a warning) when the cluster has no template for it. */
async function ensureDataStream({
  esClient,
  log,
  dataStream,
}: {
  esClient: Client;
  log: ToolingLog;
  dataStream: string;
}): Promise<boolean> {
  try {
    await esClient.indices.createDataStream({ name: dataStream });
    log.debug(`Created data stream ${dataStream}`);
    return true;
  } catch (error) {
    const message = getErrorMessage(error);
    if (message.includes('resource_already_exists_exception')) {
      return true;
    }
    log.warning(
      `Could not create data stream ${dataStream}; replay will reindex without it: ${message}`
    );
    return false;
  }
}
