/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interface for trained models provider
 * This interface contains the methods needed by the Elastic Assistant
 */
export interface TrainedModelsProviderInterface {
  /**
   * Get a trained model by ID
   * @param modelId The model ID
   */
  getTrainedModel(modelId: string): Promise<{
    model_id: string;
    [key: string]: any;
  }>;

  /**
   * Get trained model deployment stats
   * @param modelId The model ID
   */
  getTrainedModelDeploymentStats(modelId: string): Promise<{
    deployment_id: string;
    state: string;
    [key: string]: any;
  }>;

  /**
   * Check if a trained model exists
   * @param modelId The model ID
   */
  trainedModelExists(modelId: string): Promise<boolean>;

  /**
   * Check if a trained model is deployed
   * @param modelId The model ID
   */
  isTrainedModelDeployed(modelId: string): Promise<boolean>;

  /**
   * Start a trained model deployment
   * @param modelId The model ID
   * @param deploymentId Optional deployment ID
   * @param priority Optional deployment priority
   * @param queueCapacity Optional queue capacity
   * @param threadsPerAllocation Optional threads per allocation
   * @param numberOfAllocations Optional number of allocations
   */
  startDeployment(
    modelId: string,
    deploymentId?: string,
    priority?: string,
    queueCapacity?: number,
    threadsPerAllocation?: number,
    numberOfAllocations?: number
  ): Promise<{
    deployment_id: string;
    [key: string]: any;
  }>;

  /**
   * Stop a trained model deployment
   * @param modelId The model ID
   */
  stopDeployment(modelId: string): Promise<{
    stopped: boolean;
    [key: string]: any;
  }>;
}
