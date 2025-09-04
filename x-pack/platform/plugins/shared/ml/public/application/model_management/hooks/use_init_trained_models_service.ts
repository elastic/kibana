/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import { useStorage } from '@kbn/ml-local-storage';
import { useMlKibana } from '@kbn/ml-kibana-context';
import { ML_SCHEDULED_MODEL_DEPLOYMENTS } from '@kbn/ml-common-types/storage';
import { DeploymentParamsMapper } from '@kbn/ml-services/model_management/deployment_params_mapper';
import type {
  ScheduledDeployment,
  TrainedModelsService,
} from '@kbn/ml-services/model_management/trained_models_service';
import { useCloudCheck } from '@kbn/ml-node-checks/node_available_warning/hooks';

import { useToastNotificationService } from '../../services/toast_notification_service';
import { useMlServerInfo } from '../../contexts/ml';
import { getNewJobLimits } from '../../services/ml_server_info';
import { useMlTelemetryClient } from '../../contexts/ml/ml_telemetry_context';

/**
 * Hook that initializes the shared TrainedModelsService instance with storage
 * for tracking active operations. The service is destroyed when no components
 * are using it and all operations are complete.
 */
export function useInitTrainedModelsService(): TrainedModelsService {
  const {
    services: {
      mlServices: { trainedModelsService },
    },
  } = useMlKibana();

  const { telemetryClient } = useMlTelemetryClient();

  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  const { nlpSettings } = useMlServerInfo();
  const cloudInfo = useCloudCheck();
  const mlServerLimits = getNewJobLimits();

  const deploymentParamsMapper = useMemo(
    () => new DeploymentParamsMapper(mlServerLimits, cloudInfo, nlpSettings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const defaultScheduledDeployments = useMemo(() => [], []);

  const [scheduledDeployments, setScheduledDeployments] = useStorage<
    typeof ML_SCHEDULED_MODEL_DEPLOYMENTS,
    ScheduledDeployment[]
  >(ML_SCHEDULED_MODEL_DEPLOYMENTS, defaultScheduledDeployments);

  const scheduledDeployments$ = useMemo(
    () => new BehaviorSubject<ScheduledDeployment[]>(scheduledDeployments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(function initTrainedModelsService() {
    trainedModelsService.init({
      scheduledDeployments$,
      setScheduledDeployments,
      displayErrorToast,
      displaySuccessToast,
      telemetryService: telemetryClient,
      deploymentParamsMapper,
    });

    return () => {
      trainedModelsService.destroy();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function syncSubject() {
      scheduledDeployments$.next(scheduledDeployments);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduledDeployments, trainedModelsService]
  );

  return trainedModelsService;
}
