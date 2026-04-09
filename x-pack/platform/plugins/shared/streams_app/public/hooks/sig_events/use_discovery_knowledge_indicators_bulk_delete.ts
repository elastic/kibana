/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';
import { useRef } from 'react';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { DISCOVERY_QUERIES_QUERY_KEY } from './use_fetch_discovery_queries';
import { useKibana } from '../use_kibana';
import { useQueriesApi } from './use_queries_api';
import type { BulkOperationResult } from './use_discovery_features_api';
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

  const hadPartialFailureRef = useRef(false);

  const mutation = useMutation<void, Error, KnowledgeIndicator[]>({
    mutationFn: async (knowledgeIndicators) => {
      hadPartialFailureRef.current = false;

      const features = knowledgeIndicators
        .filter((ki) => ki.kind === 'feature')
        .map((ki) => ki.feature);

      const queries = knowledgeIndicators.filter((ki) => ki.kind === 'query');

      const requests: Array<Promise<BulkOperationResult | void>> = [];

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

      const results = await Promise.allSettled(requests);

      const hasRejected = results.some((r) => r.status === 'rejected');
      const featuresResult = features.length > 0 ? results[0] : undefined;
      const hasPartialFeatureFailure =
        featuresResult?.status === 'fulfilled' &&
        featuresResult.value &&
        'failedCount' in featuresResult.value &&
        featuresResult.value.failedCount > 0;

      if (hasRejected) {
        throw new Error(BULK_DELETE_REJECTED_ERROR_MESSAGE);
      }

      hadPartialFailureRef.current = Boolean(hasPartialFeatureFailure);
    },
    onSuccess: () => {
      if (hadPartialFailureRef.current) {
        toasts.addWarning({ title: BULK_DELETE_PARTIAL_TOAST_TITLE });
      } else {
        toasts.addSuccess({ title: BULK_DELETE_SUCCESS_TOAST_TITLE });
      }
      onSuccess?.();
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

const BULK_DELETE_REJECTED_ERROR_MESSAGE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkDeleteRejectedErrorMessage',
  {
    defaultMessage: 'Some knowledge indicators could not be deleted',
  }
);

const BULK_DELETE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkDeleteErrorToastTitle',
  {
    defaultMessage: 'Failed to delete selected knowledge indicators',
  }
);

const BULK_DELETE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkDeletePartialToastTitle',
  {
    defaultMessage: 'Some knowledge indicators could not be deleted',
  }
);

const BULK_DELETE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkDeleteSuccessToastTitle',
  {
    defaultMessage: 'Knowledge indicators deleted',
  }
);
