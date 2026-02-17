/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Relationship, RelationshipDirection } from '@kbn/streams-schema';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';

export const useRelationshipsApi = ({ streamName }: { streamName: string }) => {
  const { signal } = useAbortController();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const linkRelationship = useCallback(
    async (relationship: Relationship) => {
      await streamsRepositoryClient.fetch('PUT /internal/streams/{name}/relationships', {
        signal,
        params: {
          path: {
            name: streamName,
          },
          body: relationship,
        },
      });
    },
    [streamName, signal, streamsRepositoryClient]
  );

  const unlinkRelationship = useCallback(
    async (targetStream: string, direction: RelationshipDirection = 'bidirectional') => {
      await streamsRepositoryClient.fetch(
        'DELETE /internal/streams/{name}/relationships/{targetStream}',
        {
          signal,
          params: {
            path: {
              name: streamName,
              targetStream,
            },
            query: {
              direction,
            },
          },
        }
      );
    },
    [streamName, signal, streamsRepositoryClient]
  );

  return {
    linkRelationship,
    unlinkRelationship,
  };
};
