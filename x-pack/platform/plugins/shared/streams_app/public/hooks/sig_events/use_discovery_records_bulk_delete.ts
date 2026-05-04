/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import { useKibana } from '../use_kibana';
import { getFormattedError } from '../../util/errors';
import type { DiscoveryKind } from './use_discovery_records';

interface BulkDeleteResult {
  succeeded: number;
  failed: number;
}

interface UseDiscoveryRecordsBulkDeleteParams {
  kind: DiscoveryKind;
  onSuccess?: () => void;
}

export function useDiscoveryRecordsBulkDelete({
  kind,
  onSuccess,
}: UseDiscoveryRecordsBulkDeleteParams) {
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

  const mutation = useMutation<BulkDeleteResult, Error, string[]>({
    mutationFn: async (ids) => {
      const response = await streamsRepositoryClient.fetch(
        'POST /internal/streams/_discovery_records/_bulk_delete',
        {
          signal: null,
          params: { body: { kind, ids } },
        }
      );
      if (response.succeeded === 0 && response.failed > 0) {
        throw new Error(BULK_DELETE_REJECTED_ERROR_MESSAGE);
      }
      return { succeeded: response.succeeded, failed: response.failed };
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
      toasts.addError(getFormattedError(error), { title: BULK_DELETE_ERROR_TOAST_TITLE });
    },
  });

  return {
    deleteRecordsInBulk: async (ids: string[]) => {
      if (ids.length === 0) return;
      await mutation.mutateAsync(ids);
    },
    isDeleting: mutation.isLoading,
  };
}

const BULK_DELETE_REJECTED_ERROR_MESSAGE = i18n.translate(
  'xpack.streams.sigEventsDiscovery.multiStep.bulkDeleteRejectedErrorMessage',
  { defaultMessage: 'None of the selected records could be deleted.' }
);

const BULK_DELETE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.sigEventsDiscovery.multiStep.bulkDeleteErrorToastTitle',
  { defaultMessage: 'Failed to delete selected records' }
);

const getBulkDeletePartialToastTitle = (succeeded: number, failed: number) =>
  i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.bulkDeletePartialToastTitle', {
    defaultMessage:
      '{succeeded, plural, one {# record} other {# records}} deleted. {failed, plural, one {# record} other {# records}} failed.',
    values: { succeeded, failed },
  });

const getBulkDeleteSuccessToastTitle = (count: number) =>
  i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.bulkDeleteSuccessToastTitle', {
    defaultMessage: '{count, plural, one {# record} other {# records}} deleted',
    values: { count },
  });
