/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { useStorage } from '@kbn/ml-local-storage';
import { ML_SCHEDULED_MODEL_DEPLOYMENTS } from '../../../../common/types/storage';
import type { TrainedModelsService } from '../trained_models_service';
import { useMlKibana } from '../../contexts/kibana';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { useSavedObjectsApiService } from '../../services/ml_api_service/saved_objects';
import type { StartAllocationParams } from '../../services/ml_api_service/trained_models';

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

  const defaultScheduledDeployments = useMemo(() => [], []);

  const [scheduledDeployments, setScheduledDeployments] = useStorage<
    typeof ML_SCHEDULED_MODEL_DEPLOYMENTS,
    StartAllocationParams[]
  >(ML_SCHEDULED_MODEL_DEPLOYMENTS, defaultScheduledDeployments);

  const scheduledDeployments$ = useMemo(
    () => new BehaviorSubject<StartAllocationParams[]>(scheduledDeployments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(function initTrainedModelsService() {
    trainedModelsService.init({
      scheduledDeployments$,
      setScheduledDeployments,
      displayErrorToast,
      displaySuccessToast,
      savedObjectsApiService,
      canManageSpacesAndSavedObjects,
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
