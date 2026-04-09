/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { DISCOVERY_QUERIES_QUERY_KEY } from './use_fetch_discovery_queries';
import { useKibana } from '../use_kibana';
import { useQueriesApi } from './use_queries_api';
import { useDiscoveryFeaturesApi } from './use_discovery_features_api';

interface UseDiscoveryKnowledgeIndicatorsBulkDeleteParams {
  onSuccess?: () => void;
}

export function useDiscoveryKnowledgeIndicatorsBulkDelete({
  onSuccess,
}: UseDiscoveryKnowledgeIndicatorsBulkDeleteParams = {}) {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const { deleteFeaturesInBulk } = useDiscoveryFeaturesApi();
  const { deleteQueriesInBulk } = useQueriesApi();

  const mutation = useMutation<void, Error, KnowledgeIndicator[]>({
    mutationFn: async (knowledgeIndicators) => {
      const features = knowledgeIndicators
        .filter((ki) => ki.kind === 'feature')
        .map((ki) => ki.feature);

      const queries = knowledgeIndicators.filter((ki) => ki.kind === 'query');

      const requests: Array<Promise<unknown>> = [];

      if (features.length > 0) {
        requests.push(deleteFeaturesInBulk(features));
      }

      if (queries.length > 0) {
        const queriesByStream = groupBy(queries, 'stream_name');
        for (const [streamName, streamQueries] of Object.entries(queriesByStream)) {
          requests.push(
            deleteQueriesInBulk({
              queryIds: streamQueries.map((q) => q.query.id),
              streamName,
            })
          );
        }
      }

      await Promise.all(requests);
    },
    onSuccess: async () => {
      onSuccess?.();
      toasts.addSuccess({ title: BULK_DELETE_SUCCESS_TOAST_TITLE });
    },
    onError: (error) => {
      toasts.addError(error, { title: BULK_DELETE_ERROR_TOAST_TITLE });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['features', 'all'] }),
      ]);
    },
  });

  return {
    deleteKnowledgeIndicatorsInBulk: async (knowledgeIndicators: KnowledgeIndicator[]) => {
      if (knowledgeIndicators.length === 0) {
        return;
      }
      await mutation.mutateAsync(knowledgeIndicators);
    },
    isDeleting: mutation.isLoading,
  };
}

const BULK_DELETE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkDeleteErrorToastTitle',
  {
    defaultMessage: 'Failed to delete selected knowledge indicators',
  }
);

const BULK_DELETE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkDeleteSuccessToastTitle',
  {
    defaultMessage: 'Knowledge indicators deleted',
  }
);
