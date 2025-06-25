/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InstallationStatusResponse,
  PerformInstallResponse,
  UninstallResponse,
  ProductDocInstallParams,
} from '../../../common/http_api/installation';

export interface InstallationAPI {
  getStatus(params: ProductDocInstallParams): Promise<InstallationStatusResponse>;
  install(params: ProductDocInstallParams): Promise<PerformInstallResponse>;
  uninstall(params: ProductDocInstallParams): Promise<UninstallResponse>;
}
