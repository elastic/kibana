/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useState, useMemo } from 'react';
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
  kbState: 'NOT_INSTALLED' | 'CREATING_ENDPOINT' | 'DEPLOYING_MODEL' | 'READY' | 'ERROR';
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

  // Start polling if the current status is in a transitional or error state
  useEffect(() => {
    const currentStatus = statusRequest.value;

    const shouldStartPolling =
      currentStatus &&
      !isPollingForDeployment &&
      !currentStatus.ready &&
      (!currentStatus.endpoint ||
        currentStatus.model_stats?.deployment_state === 'starting' ||
        currentStatus.model_stats?.allocation_state === 'starting' ||
        currentStatus.model_stats?.deployment_state === 'failed');

    if (shouldStartPolling) {
      setIsPollingForDeployment(true);
    }
  }, [statusRequest.value, isPollingForDeployment]);

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

  // Define the finite states for the knowledge base
  type KnowledgeBaseState =
    | 'NOT_INSTALLED'
    | 'CREATING_ENDPOINT'
    | 'DEPLOYING_MODEL'
    | 'READY'
    | 'ERROR';

  // Compute the overall knowledge base state by combining isInstalling, installError and the API status
  const kbState: KnowledgeBaseState = useMemo(() => {
    // If installation was triggered but we haven't received a status yet
    if (isInstalling) {
      // If no status or no endpoint, then we're still creating the endpoint
      if (!statusRequest.value || !statusRequest.value.endpoint) {
        return 'CREATING_ENDPOINT';
      } else {
        // If the endpoint exists but the model isn't fully deployed, we're in the deploying phase
        return 'DEPLOYING_MODEL';
      }
    }

    // If installation is not active, determine state from the status response
    if (!statusRequest.value || !statusRequest.value.endpoint) return 'NOT_INSTALLED';
    if (statusRequest.value.ready) return 'READY';

    // If endpoint exists but is not ready, inspect the model stats
    if (statusRequest.value.model_stats) {
      const {
        allocation_count: allocationCount,
        deployment_state: deploymentState,
        allocation_state: allocationState,
      } = statusRequest.value.model_stats;
      // If there are no allocations or states indicate 'starting', then we're in the deploying phase
      if (
        allocationCount === 0 ||
        deploymentState === 'starting' ||
        allocationState === 'starting'
      ) {
        return 'DEPLOYING_MODEL';
      }
    }

    // If there was an error creating endpoint, mark as ERROR
    if (installError) return 'ERROR';
    // the endpoint exists but there are no deployment stats, model is not deployed for some reason
    if (statusRequest?.value?.endpoint && !statusRequest.value?.model_stats) {
      setInstallError(new Error('MODEL_NOT_DEPLOYED'));
      return 'ERROR';
    }

    // Fallback
    return 'ERROR';
  }, [installError, isInstalling, statusRequest.value]);

  return {
    status: statusRequest,
    install,
    isInstalling,
    installError,
    kbState,
  };
}
