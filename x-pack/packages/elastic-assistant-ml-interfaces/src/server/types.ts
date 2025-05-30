/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generic Kibana request interface to avoid direct dependency on core
 */
export interface KibanaRequestInterface {
  headers: Record<string, string | string[] | undefined>;
  [key: string]: any;
}

/**
 * Generic SavedObjects client interface to avoid direct dependency on core
 */
export interface SavedObjectsClientInterface {
  get: (type: string, id: string) => Promise<any>;
  find: (options: any) => Promise<any>;
  create: (type: string, attributes: any, options?: any) => Promise<any>;
  [key: string]: any;
}

/**
 * Interface for ML Plugin Setup services used by Elastic Assistant
 * This interface contains only the methods and properties needed by the Elastic Assistant
 * to prevent circular dependencies
 */
export interface MlPluginSetupInterface {
  /**
   * Provider for trained models functionality
   * @param request The Kibana request
   * @param savedObjectsClient The saved objects client
   */
  trainedModelsProvider: (
    request: KibanaRequestInterface,
    savedObjectsClient: SavedObjectsClientInterface
  ) => any; // Will be defined as TrainedModelsProviderInterface in the providers file
}

/**
 * ML memory stats response
 */
export interface MlMemoryStatsResponse {
  // Add the properties needed by Elastic Assistant
  [key: string]: any;
}

/**
 * ES ML API interfaces used by Elastic Assistant
 */
export interface EsMlApiInterface {
  /**
   * Get memory stats
   */
  getMemoryStats(params: { human: boolean }): Promise<MlMemoryStatsResponse>;

  /**
   * Start trained model deployment
   */
  startTrainedModelDeployment(params: any): Promise<any>;

  // Add other ML ES API methods used by Elastic Assistant
}
