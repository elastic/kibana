/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useState } from 'react';
import pRetry from 'p-retry';
import {
  type AbortableAsyncState,
  useAbortableAsync,
  APIReturnType,
  KnowledgeBaseState,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from './use_kibana';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';

export interface UseKnowledgeBaseResult {
  status: AbortableAsyncState<APIReturnType<'GET /internal/observability_ai_assistant/kb/status'>>;
  isInstalling: boolean;
  isPolling: boolean;
  install: () => Promise<void>;
}

export function useKnowledgeBase(): UseKnowledgeBaseResult {
  const { notifications, ml } = useKibana().services;
  const service = useAIAssistantAppService();

  const statusRequest = useAbortableAsync(
    ({ signal }) => {
      return service.callApi('GET /internal/observability_ai_assistant/kb/status', { signal });
    },
    [service]
  );

  const [isInstalling, setIsInstalling] = useState(false);
  const isPolling =
    !!statusRequest.value?.endpoint && statusRequest.value?.kbState !== KnowledgeBaseState.READY;

  useEffect(() => {
    if (isInstalling && !!statusRequest.value?.endpoint) {
      setIsInstalling(false);
    }
  }, [isInstalling, statusRequest]);

  const install = useCallback(async () => {
    setIsInstalling(true);
    try {
      // Retry the setup with a maximum of 5 attempts
      await pRetry(
        async () => {
          await service.callApi('POST /internal/observability_ai_assistant/kb/setup', {
            signal: null,
          });
        },
        {
          retries: 5,
        }
      );
      if (ml.mlApi?.savedObjects.syncSavedObjects) {
        await ml.mlApi.savedObjects.syncSavedObjects();
      }

      // Refresh status after installation
      statusRequest.refresh();
    } catch (error) {
      notifications!.toasts.addError(error, {
        title: i18n.translate('xpack.aiAssistant.errorSettingUpInferenceEndpoint', {
          defaultMessage: 'Could not create inference endpoint',
        }),
      });
    }
  }, [ml, service, notifications, statusRequest]);

  // poll the status if isPolling (inference endpoint is created but deployment is not ready)
  useEffect(() => {
    if (!isPolling) {
      return;
    }

    const interval = setInterval(statusRequest.refresh, 5000);

    if (statusRequest.value?.kbState === KnowledgeBaseState.READY) {
      // done installing
      clearInterval(interval);
      return;
    }

    // cleanup the interval if unmount
    return () => {
      clearInterval(interval);
    };
  }, [statusRequest, isPolling]);

  return {
    status: statusRequest,
    install,
    isInstalling,
    isPolling,
  };
}
