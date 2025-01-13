/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { take, type Subscription } from 'rxjs';
import { TrainedModelsService } from '../trained_models_service';
import type { TrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';

/**
 * Singleton instance of the service shared across all components
 */
let trainedModelsService: TrainedModelsService | null = null;

/**
 * Tracks how many components are currently using the service
 */
let usageCount = 0;

/**
 * Single subscription watching active operations for cleanup
 */
let activeOpsSubscription: Subscription | null = null;

/**
 * Creates or returns the existing singleton service instance
 */
function getOrCreateService(
  trainedModelsApiService: TrainedModelsApiService
): TrainedModelsService {
  if (!trainedModelsService) {
    trainedModelsService = new TrainedModelsService(trainedModelsApiService);
  }
  return trainedModelsService;
}

/**
 * Cleans up the singleton instance and its subscriptions
 */
function destroyService() {
  if (trainedModelsService) {
    trainedModelsService.destroy();
    trainedModelsService = null;
  }

  if (activeOpsSubscription) {
    activeOpsSubscription.unsubscribe();
    activeOpsSubscription = null;
  }
}

/**
 * Hook that provides access to the shared TrainedModelsService instance.
 * The service is created on first use and destroyed when no components are using it
 * and all operations are complete.
 */
export function useTrainedModelsService(): TrainedModelsService {
  const api = useTrainedModelsApiService();
  const service = getOrCreateService(api);

  useEffect(() => {
    usageCount++;

    return () => {
      usageCount--;

      // Only attempt cleanup when no components are using the service
      if (usageCount === 0) {
        service.activeOperations$.pipe(take(1)).subscribe((operations) => {
          if (operations.length === 0) {
            destroyService();
          } else {
            // Wait for all operations to complete before destroying
            activeOpsSubscription?.unsubscribe();
            activeOpsSubscription = service.activeOperations$.subscribe((ops) => {
              // Check if usageCount is 0 again in case user navigates back to the page
              if (ops.length === 0 && usageCount === 0) {
                destroyService();
              }
            });
          }
        });
      }
    };
  }, [service]);

  return service;
}
