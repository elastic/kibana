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

interface UseKnowledgeIndicatorsBulkDeleteParams {
  onSuccess?: () => void;
}

export function useKnowledgeIndicatorsBulkDelete({
  onSuccess,
}: UseKnowledgeIndicatorsBulkDeleteParams = {}) {
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

      const featuresPromise = features.length > 0 ? deleteFeaturesInBulk(features) : undefined;

      const queryPromises: Array<Promise<void>> = [];
      if (queries.length > 0) {
        const queriesByStream = groupBy(queries, 'stream_name');
        for (const [streamName, streamQueries] of Object.entries(queriesByStream)) {
          queryPromises.push(
            deleteQueriesInBulk({
              queryIds: streamQueries.map((q) => q.query.id),
              streamName,
            })
          );
        }
      }

      const [featuresSettled, querySettled] = await Promise.all([
        featuresPromise
          ? featuresPromise
              .then(
                (value): PromiseSettledResult<BulkOperationResult> => ({
                  status: 'fulfilled',
                  value,
                })
              )
              .catch(
                (reason): PromiseSettledResult<BulkOperationResult> => ({
                  status: 'rejected',
                  reason,
                })
              )
          : undefined,
        Promise.allSettled(queryPromises),
      ]);

      const hasRejected =
        featuresSettled?.status === 'rejected' || querySettled.some((r) => r.status === 'rejected');
      const hasPartialFeatureFailure =
        featuresSettled?.status === 'fulfilled' && featuresSettled.value.failedCount > 0;

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
        queryClient.invalidateQueries({ queryKey: ['features'], exact: false }),
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
  'xpack.streams.knowledgeIndicators.bulkDeleteRejectedErrorMessage',
  {
    defaultMessage: 'Some knowledge indicators could not be deleted',
  }
);

const BULK_DELETE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicators.bulkDeleteErrorToastTitle',
  {
    defaultMessage: 'Failed to delete selected knowledge indicators',
  }
);

const BULK_DELETE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicators.bulkDeletePartialToastTitle',
  {
    defaultMessage: 'Some knowledge indicators could not be deleted',
  }
);

const BULK_DELETE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicators.bulkDeleteSuccessToastTitle',
  {
    defaultMessage: 'Knowledge indicators deleted',
  }
);
