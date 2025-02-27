/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamGetResponse } from '@kbn/streams-schema';
import { fromPromise } from 'xstate5';
import { StreamDetailServiceDependencies } from './types';

export interface LoadDefinitionInput {
  name: string;
}

export function createLoadDefinitionActor({
  streamsRepositoryClient,
}: Pick<StreamDetailServiceDependencies, 'streamsRepositoryClient'>) {
  return fromPromise<StreamGetResponse, LoadDefinitionInput>(({ input, signal }) => {
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
