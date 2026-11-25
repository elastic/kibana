/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type {
  AiIndexProperties,
  AiIndexSaveWarning,
  GetAiIndexResponse,
  PutAiIndexResponse,
} from '../../../common/http_api/ai_indices';
import { putAiIndex } from '../api/ai_indices';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

const MAX_WARNINGS_SHOWN = 3;
const MAX_WARNING_SOURCE_LENGTH = 60;

const describeWarnings = (warnings: AiIndexSaveWarning[]): string => {
  const shown = warnings.slice(0, MAX_WARNINGS_SHOWN).map(({ source, message }) => {
    const value = source.value.replace(/\s+/g, ' ').trim();
    const label =
      value.length > MAX_WARNING_SOURCE_LENGTH
        ? `${value.slice(0, MAX_WARNING_SOURCE_LENGTH - 1)}…`
        : value;
    return `${label}: ${message}${/[.!?]$/.test(message) ? '' : '.'}`;
  });
  const more = warnings.length - shown.length;
  return more > 0
    ? [
        ...shown,
        i18n.translate('xpack.contextEngine.saveAiIndexField.moreWarnings', {
          defaultMessage: 'And {count} more.',
          values: { count: more },
        }),
      ].join(' ')
    : shown.join(' ');
};

interface UseSaveAiIndexFieldOptions<TValue> {
  errorTitle: string;
  /** Titles the warning toast shown when the save went through but part of what it sets off did not. */
  warningTitle?: string;
  buildProperties: (aiIndex: GetAiIndexResponse, value: TValue) => AiIndexProperties;
}

/**
 * Strips the server-managed fields from a fetched AI index, leaving the writable
 * properties. Everything else is spread through, so any new field added to
 * `AiIndexProperties` is carried over automatically.
 */
export const toProperties = ({
  id,
  managed,
  date_created: _dateCreated,
  date_modified: _dateModified,
  traces,
  ...properties
}: GetAiIndexResponse): AiIndexProperties => ({
  ...properties,
  traces: traces.map(({ type, value }) => ({ type, value })),
});

/**
 * Shared logic for hooks that update a single field on an existing AI index. The
 * PUT endpoint is an upsert of the full record, so `buildProperties` is expected
 * to carry over every unchanged field and only replace the targeted one.
 */
export const useSaveAiIndexField = <TValue>({
  errorTitle,
  warningTitle,
  buildProperties,
}: UseSaveAiIndexFieldOptions<TValue>) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation<
    PutAiIndexResponse,
    Error,
    { aiIndex: GetAiIndexResponse; value: TValue }
  >({
    mutationFn: ({ aiIndex, value }) =>
      putAiIndex(http, { aiIndexId: aiIndex.id, properties: buildProperties(aiIndex, value) }),
    onSuccess: ({ warnings }) => {
      queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.aiIndex.list() });
      if (warningTitle && warnings && warnings.length > 0) {
        notifications.toasts.addWarning({ title: warningTitle, text: describeWarnings(warnings) });
      }
    },
    onError: (error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: errorTitle,
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });

  const save = useCallback(
    async (aiIndex: GetAiIndexResponse, value: TValue): Promise<boolean> => {
      try {
        await mutateAsync({ aiIndex, value });
        return true;
      } catch {
        // The error toast is surfaced by the mutation's onError handler.
        return false;
      }
    },
    [mutateAsync]
  );

  return { save, isSaving: isLoading };
};
