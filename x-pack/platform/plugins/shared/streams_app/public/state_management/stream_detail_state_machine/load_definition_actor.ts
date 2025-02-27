/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamGetResponse } from '@kbn/streams-schema';
import { fromPromise } from 'xstate5';
import { StreamEnrichmentServiceDependencies } from '../stream_enrichment_service/types';

interface LoadStreamInput {
  name: string;
}

export function createLoadDefinitionActor({
  streamsRepositoryClient,
}: Pick<StreamEnrichmentServiceDependencies, 'streamsRepositoryClient'>) {
  return fromPromise<StreamGetResponse, LoadStreamInput>(({ input, signal }) => {
    return streamsRepositoryClient.fetch('GET /api/streams/{name}', {
      signal,
      params: {
        path: {
          name: input.name,
        },
      },
    });
  });
}
