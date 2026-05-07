/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SigEventDocType } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';

interface UseRawDocumentParams {
  type: SigEventDocType;
  docId: string;
  enabled: boolean;
}

export const useRawDocument = ({ type, docId, enabled }: UseRawDocumentParams) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return useStreamsAppFetch(
    async ({ signal }) => {
      if (!enabled) return undefined;
      return streamsRepositoryClient.fetch('GET /internal/streams/sig_events/raw/{type}/{docId}', {
        params: { path: { type, docId } },
        signal,
      });
    },
    [streamsRepositoryClient, type, docId, enabled]
  );
};
