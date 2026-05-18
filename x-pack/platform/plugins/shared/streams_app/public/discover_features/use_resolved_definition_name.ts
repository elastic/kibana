/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';

export interface ResolvedDefinitionName {
  name?: string;
  existsLocally: boolean;
  remoteProject?: string;
}

export function useResolvedDefinitionName({
  streamsRepositoryClient,
  index,
  fallbackStreamName,
  cpsHasLinkedProjects,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  index?: string;
  fallbackStreamName?: string;
  cpsHasLinkedProjects?: boolean;
}) {
  return useAbortableAsync(
    async ({ signal }): Promise<ResolvedDefinitionName | undefined> => {
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
      } else {
        try {
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
        } catch {
          const remoteInfo = parseRemoteIndex(index);
          if (remoteInfo) {
            return {
              name: remoteInfo.streamName,
              existsLocally: false,
              remoteProject: remoteInfo.projectName,
            };
          }
          return { name: fallbackStreamName, existsLocally: false };
        }
      }
    },
    [streamsRepositoryClient, index, fallbackStreamName, cpsHasLinkedProjects]
  );
}

function parseRemoteIndex(index: string): { projectName: string; streamName: string } | undefined {
  const colonIdx = index.indexOf(':');
  if (colonIdx <= 0) return undefined;

  const projectName = index.substring(0, colonIdx);
  const backingIndex = index.substring(colonIdx + 1);

  const match = backingIndex.match(/^\.ds-(.+)-\d{4}\.\d{2}\.\d{2}-\d+$/);
  if (!match) return undefined;

  return { projectName, streamName: match[1] };
}

export function adaptDocToResolverInputs(doc: DataTableRecord) {
  return {
    index: doc.raw._index,
    fallbackStreamName: getFallbackStreamName(doc.flattened),
  };
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
