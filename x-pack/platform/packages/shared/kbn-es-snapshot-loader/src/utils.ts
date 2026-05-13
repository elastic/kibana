/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * Extracts the data stream name from a backing index name.
 * Backing indices have format: .ds-{data-stream-name}-{date}-{sequence}
 * Example: .ds-metrics-system.cpu-default-2025.12.08-000001 -> metrics-system.cpu-default
 */
export function extractDataStreamName(backingIndexName: string): string | null {
  const match = backingIndexName.match(/^\.ds-(.+)-\d{4}\.\d{2}\.\d{2}-\d+$/);
  return match ? match[1] : null;
}

export async function getMissingDataStreams({
  esClient,
  dataStreamNames,
}: {
  esClient: Client;
  dataStreamNames: Iterable<string>;
}): Promise<string[]> {
  const missing: string[] = [];

  for (const name of dataStreamNames) {
    try {
      await esClient.indices.getDataStream({ name });
    } catch (error) {
      const statusCode = (error as { meta?: { statusCode?: number } })?.meta?.statusCode;
      if (statusCode === 404) {
        missing.push(name);
        continue;
      }
      throw error;
    }
  }

  return missing;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
