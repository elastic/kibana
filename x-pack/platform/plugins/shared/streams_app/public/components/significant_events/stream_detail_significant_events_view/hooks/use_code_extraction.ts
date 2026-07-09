/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useAbortController } from '@kbn/react-hooks';
import { useCallback } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../../hooks/significant_events/use_fetch_discovery_queries';

/**
 * Runs the code intelligence pipeline for a single stream on demand: Stage 1
 * (code Feature KIs) -> Stage 2 (predictive Query KIs) -> reconcile. Mirrors the
 * scheduled managed workflow but user-triggered from the per-stream UI.
 */
export function useCodeExtraction({ streamName }: { streamName: string }) {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const { signal } = useAbortController();

  const { mutate, isLoading } = useMutation({
    mutationFn: async () => {
      await streamsRepositoryClient.fetch(
        'POST /internal/streams/{streamName}/code_features/_identify',
        { signal, params: { path: { streamName }, body: {} } }
      );
      await streamsRepositoryClient.fetch(
        'POST /internal/streams/{streamName}/code_features/_generate_queries',
        { signal, params: { path: { streamName } } }
      );
      await streamsRepositoryClient.fetch(
        'POST /internal/streams/{streamName}/code_features/_reconcile_queries',
        { signal, params: { path: { streamName } } }
      );
    },
    onSuccess: () => {
      toasts.addSuccess({ title: CODE_EXTRACTION_SUCCESS_TITLE });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['features', streamName] }),
        queryClient.invalidateQueries({ queryKey: ['code-features', streamName] }),
      ]);
    },
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), { title: CODE_EXTRACTION_FAILURE_TITLE });
    },
  });

  const generateFromCode = useCallback(() => mutate(), [mutate]);

  return { generateFromCode, isGeneratingFromCode: isLoading };
}

const CODE_EXTRACTION_SUCCESS_TITLE = i18n.translate(
  'xpack.streams.codeExtraction.successToastTitle',
  { defaultMessage: 'Generated knowledge indicators from code' }
);

const CODE_EXTRACTION_FAILURE_TITLE = i18n.translate(
  'xpack.streams.codeExtraction.failureToastTitle',
  { defaultMessage: 'Failed to generate knowledge indicators from code' }
);
