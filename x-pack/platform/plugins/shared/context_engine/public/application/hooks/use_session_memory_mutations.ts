/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  RememberSessionMemoryBody,
  RememberSessionMemoryResponse,
  SaveSessionEventBody,
  SaveSessionEventResponse,
  SearchSessionMemoryBody,
  SearchSessionMemoryResponse,
} from '../../../common/http_api/session_memory';
import {
  rememberSessionMemory,
  saveSessionEvent,
  searchSessionMemory,
} from '../api/session_memory';
import { getErrorMessage } from '../utils/get_error_message';
import { useKibana } from './use_kibana';

const useErrorToast = (title: string) => {
  const {
    services: { notifications },
  } = useKibana();
  return (error: Error) => {
    notifications.toasts.addError(error, { title, toastMessage: getErrorMessage(error) });
  };
};

export const useRememberSessionMemory = () => {
  const {
    services: { http },
  } = useKibana();
  const onError = useErrorToast(
    i18n.translate('xpack.contextEngine.sessionMemory.remember.errorTitle', {
      defaultMessage: 'Unable to remember session memory',
    })
  );

  return useMutation<RememberSessionMemoryResponse, Error, RememberSessionMemoryBody>({
    mutationFn: (body) => rememberSessionMemory(http, { body }),
    onError,
  });
};

export const useSearchSessionMemory = () => {
  const {
    services: { http },
  } = useKibana();
  const onError = useErrorToast(
    i18n.translate('xpack.contextEngine.sessionMemory.search.errorTitle', {
      defaultMessage: 'Unable to search session memory',
    })
  );

  return useMutation<SearchSessionMemoryResponse, Error, SearchSessionMemoryBody>({
    mutationFn: (body) => searchSessionMemory(http, { body }),
    onError,
  });
};

export const useSaveSessionEvent = () => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();
  const onError = useErrorToast(
    i18n.translate('xpack.contextEngine.sessionMemory.saveEvent.errorTitle', {
      defaultMessage: 'Unable to save session event',
    })
  );

  return useMutation<SaveSessionEventResponse, Error, SaveSessionEventBody>({
    mutationFn: async (body) => {
      const response = await saveSessionEvent(http, { body });
      await queryClient.invalidateQueries({
        queryKey: ['context_engine', 'session_events', body.session_id],
      });
      return response;
    },
    onError,
  });
};
