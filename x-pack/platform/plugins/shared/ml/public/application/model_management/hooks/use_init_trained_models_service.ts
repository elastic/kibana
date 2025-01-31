/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { useStorage } from '@kbn/ml-local-storage';
import { ML_ACTIVE_MODEL_DEPLOYMENTS } from '../../../../common/types/storage';
import type { ModelDeploymentParams } from '../trained_models_service';
import type { TrainedModelsService } from '../trained_models_service';
import { useMlKibana } from '../../contexts/kibana';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { useSavedObjectsApiService } from '../../services/ml_api_service/saved_objects';

/**
 * Hook that initializes the shared TrainedModelsService instance with storage
 * for tracking active operations. The service is destroyed when no components
 * are using it and all operations are complete.
 */
export function useInitTrainedModelsService(
  canManageSpacesAndSavedObjects: boolean
): TrainedModelsService {
  const {
    services: {
      mlServices: { trainedModelsService },
    },
  } = useMlKibana();

  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  const savedObjectsApiService = useSavedObjectsApiService();

  const initialDeployingState = useMemo(() => [], []);

  const [deployingModels, setDeployingModels] = useStorage<
    typeof ML_ACTIVE_MODEL_DEPLOYMENTS,
    ModelDeploymentParams[]
  >(ML_ACTIVE_MODEL_DEPLOYMENTS, initialDeployingState);

  const deployingModels$ = useMemo(
    () => new BehaviorSubject<ModelDeploymentParams[]>(deployingModels),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    trainedModelsService.init({
      deployingModels$,
      setDeployingModels,
      displayErrorToast,
      displaySuccessToast,
      savedObjectsApiService,
      canManageSpacesAndSavedObjects,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function syncSubject() {
      deployingModels$.next(deployingModels);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deployingModels, trainedModelsService]
  );

  useEffect(() => {
    return () => {
      trainedModelsService.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return trainedModelsService;
}
