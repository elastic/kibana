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
import type { BulkOperationResult } from './use_discovery_features_api';
import { useDiscoveryFeaturesApi } from './use_discovery_features_api';

interface BulkDeleteResult {
  succeeded: number;
  failed: number;
}

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

  const mutation = useMutation<BulkDeleteResult, Error, KnowledgeIndicator[]>({
    mutationFn: async (knowledgeIndicators) => {
      const features = knowledgeIndicators
        .filter((ki) => ki.kind === 'feature')
        .map((ki) => ki.feature);

      const queries = knowledgeIndicators.filter((ki) => ki.kind === 'query');

      const featuresPromise = features.length > 0 ? deleteFeaturesInBulk(features) : undefined;

      const queryPromises: Array<{ promise: Promise<void>; count: number }> = [];
      if (queries.length > 0) {
        const queriesByStream = groupBy(queries, 'stream_name');
        for (const [streamName, streamQueries] of Object.entries(queriesByStream)) {
          queryPromises.push({
            promise: deleteQueriesInBulk({
              queryIds: streamQueries.map((q) => q.query.id),
              streamName,
            }),
            count: streamQueries.length,
          });
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
        Promise.allSettled(queryPromises.map((q) => q.promise)),
      ]);

      let succeeded = 0;
      let failed = 0;

      if (featuresSettled?.status === 'fulfilled') {
        succeeded += featuresSettled.value.succeededCount;
        failed += featuresSettled.value.failedCount;
      } else if (featuresSettled?.status === 'rejected') {
        failed += features.length;
      }

      querySettled.forEach((result, index) => {
        const count = queryPromises[index].count;
        if (result.status === 'fulfilled') {
          succeeded += count;
        } else {
          failed += count;
        }
      });

      if (succeeded === 0 && failed > 0) {
        throw new Error(BULK_DELETE_REJECTED_ERROR_MESSAGE);
      }

      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      if (failed > 0) {
        toasts.addWarning({ title: getBulkDeletePartialToastTitle(succeeded, failed) });
      } else {
        toasts.addSuccess({ title: getBulkDeleteSuccessToastTitle(succeeded) });
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

const getBulkDeletePartialToastTitle = (succeeded: number, failed: number) =>
  i18n.translate('xpack.streams.knowledgeIndicators.bulkDeletePartialToastTitle', {
    defaultMessage:
      '{succeeded, plural, one {# knowledge indicator} other {# knowledge indicators}} deleted. {failed, plural, one {# knowledge indicator} other {# knowledge indicators}} failed.',
    values: { succeeded, failed },
  });

const getBulkDeleteSuccessToastTitle = (count: number) =>
  i18n.translate('xpack.streams.knowledgeIndicators.bulkDeleteSuccessToastTitle', {
    defaultMessage:
      '{count, plural, one {# knowledge indicator} other {# knowledge indicators}} deleted',
    values: { count },
  });
