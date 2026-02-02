/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { type IngestStreamLifecycle } from '@kbn/streams-schema';
import { useAbortController } from '@kbn/react-hooks';
import { omit } from 'lodash';
import { useKibana } from '../../../../hooks/use_kibana';

export const useUpdateStreamLifecycle = (definition: Streams.ingest.all.GetResponse) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { signal } = useAbortController();

  const updateStreamLifecycle = async (lifecycle: IngestStreamLifecycle) => {
    await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
      params: {
        path: { name: definition.stream.name },
        body: {
          ingest: {
            ...definition.stream.ingest,
            processing: omit(definition.stream.ingest.processing, 'updated_at'),
            lifecycle,
          },
        },
      },
      signal,
    });
  };

  return { updateStreamLifecycle };
};
