/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InstallationStatusResponse,
  SecurityLabsInstallStatusResponse,
  PerformInstallResponse,
  PerformUpdateResponse,
  UninstallResponse,
  ProductDocInstallParams,
  ProductDocUpdateAvailabilityResponse,
} from '../../../common/http_api/installation';

export interface InstallationAPI {
  getStatus(
    params: ProductDocInstallParams
  ): Promise<InstallationStatusResponse | SecurityLabsInstallStatusResponse>;
  install(params: ProductDocInstallParams): Promise<PerformInstallResponse>;
  uninstall(params: ProductDocInstallParams): Promise<UninstallResponse>;
  updateAll(params?: {
    forceUpdate?: boolean;
    inferenceIds?: string[];
  }): Promise<PerformUpdateResponse>;
  getDefaultInferenceId(params?: {
    resourceType?: ProductDocInstallParams['resourceType'];
  }): Promise<string>;
  /**
   * Whether a newer product-doc artifact is in the repository.
   * GenAI Settings calls this on mount, not on the installation-status poll.
   */
  getUpdateAvailability(params: {
    inferenceId: string;
  }): Promise<ProductDocUpdateAvailabilityResponse>;
}
