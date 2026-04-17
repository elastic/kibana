/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';

export function useResolvedDefinitionName({
  streamsRepositoryClient,
  doc,
  cpsHasLinkedProjects,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  doc: DataTableRecord;
  cpsHasLinkedProjects?: boolean;
}) {
  const flattenedDoc = doc.flattened;
  const index = doc.raw._index;
  const fallbackStreamName = getFallbackStreamName(flattenedDoc);

  return useAbortableAsync(
    async ({ signal }) => {
      if (!index) {
        if (!fallbackStreamName) {
          return undefined;
        }
        if (!cpsHasLinkedProjects) {
          return { name: fallbackStreamName, existsLocally: true };
        }
        try {
          await streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
            signal,
            params: { path: { name: fallbackStreamName } },
          });
          return { name: fallbackStreamName, existsLocally: true };
        } catch {
          return { name: fallbackStreamName, existsLocally: false };
        }
      }
      const definition = await streamsRepositoryClient.fetch(
        'GET /internal/streams/_resolve_index',
        {
          signal,
          params: {
            query: {
              index,
            },
          },
        }
      );
      return { name: definition?.stream?.name, existsLocally: true };
    },
    [streamsRepositoryClient, index, fallbackStreamName, cpsHasLinkedProjects]
  );
}

function getFallbackStreamName(flattenedDoc: Record<string, unknown>) {
  const wiredStreamName = flattenedDoc['stream.name'];
  if (wiredStreamName) {
    return String(wiredStreamName);
  }
  const dsnsType = flattenedDoc['data_stream.type'];
  const dsnsDataset = flattenedDoc['data_stream.dataset'];
  const dsnsNamespace = flattenedDoc['data_stream.namespace'];
  if (dsnsType && dsnsDataset && dsnsNamespace) {
    return `${dsnsType}-${dsnsDataset}-${dsnsNamespace}`;
  }
  return undefined;
}
