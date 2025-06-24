/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductName } from '@kbn/product-doc-common';
import type { ProductInstallState, InstallationStatus } from '../install_status';

export const INSTALLATION_STATUS_API_PATH = '/internal/product_doc_base/status';
export const INSTALL_ALL_API_PATH = '/internal/product_doc_base/install';
export const UNINSTALL_ALL_API_PATH = '/internal/product_doc_base/uninstall';

export interface InstallationStatusResponse {
  overall: InstallationStatus;
  perProducts: Record<ProductName, ProductInstallState>;
}

export interface PerformInstallResponse {
  installed: boolean;
}

export interface UninstallResponse {
  success: boolean;
}
