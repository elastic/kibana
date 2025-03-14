/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useState } from 'react';
import {
  type AbortableAsyncState,
  useAbortableAsync,
  APIReturnType,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from './use_kibana';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';

export interface UseKnowledgeBaseResult {
  status: AbortableAsyncState<APIReturnType<'GET /internal/observability_ai_assistant/kb/status'>>;
  isInstalling: boolean;
  installError?: Error;
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

  const [installError, setInstallError] = useState<Error>();
  const [isPollingForDeployment, setIsPollingForDeployment] = useState(false);

  const install = useCallback(async () => {
    setIsInstalling(true);
    setIsPollingForDeployment(false);
    setInstallError(undefined);

    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    try {
      // install
      await retrySetupIfError();

      if (ml.mlApi?.savedObjects.syncSavedObjects) {
        await ml.mlApi.savedObjects.syncSavedObjects();
      }

      // do one refresh to get an initial status
      await statusRequest.refresh();

      // start polling for readiness
      setIsPollingForDeployment(true);
    } catch (e) {
      setInstallError(e);
      notifications!.toasts.addError(e, {
        title: i18n.translate('xpack.aiAssistant.errorSettingUpInferenceEndpoint', {
          defaultMessage: 'Could not create inference endpoint',
        }),
      });
      setIsInstalling(false);
    }

    async function retrySetupIfError() {
      while (true) {
        try {
          await service.callApi('POST /internal/observability_ai_assistant/kb/setup', {
            signal: null,
          });
          break;
        } catch (error) {
          if (
            (error.body?.statusCode === 503 || error.body?.statusCode === 504) &&
            attempts < MAX_ATTEMPTS
          ) {
            attempts++;
            continue;
          }
          throw error;
        }
      }
    }
  }, [ml, service, notifications, statusRequest]);

  // poll the status if isPollingForDeployment === true
  // stop when ready === true or some error
  useEffect(() => {
    if (!isPollingForDeployment) {
      return;
    }

    const interval = setInterval(async () => {
      // re-fetch /status
      await statusRequest.refresh();
      const { value: currentStatus } = statusRequest;

      // check if the model is now ready
      if (currentStatus?.ready) {
        // done installing
        setIsInstalling(false);
        setIsPollingForDeployment(false);
        clearInterval(interval);
        return;
      }

      // if "deployment failed" state
      if (currentStatus?.model_stats?.deployment_state === 'failed') {
        setInstallError(new Error('model deployment failed'));
        setIsInstalling(false);
        setIsPollingForDeployment(false);
        clearInterval(interval);
        return;
      }
    }, 5000);

    // cleanup the interval if unmount
    return () => {
      clearInterval(interval);
    };
  }, [isPollingForDeployment, statusRequest]);

  return {
    status: statusRequest,
    install,
    isInstalling,
    installError,
  };
}
