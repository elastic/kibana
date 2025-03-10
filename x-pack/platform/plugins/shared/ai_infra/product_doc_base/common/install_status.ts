/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductName } from '@kbn/product-doc-common';

export type InstallationStatus = 'installed' | 'uninstalled' | 'installing' | 'error';

/**
 * DTO representation of the product doc install status SO
 */
export interface ProductDocInstallStatus {
  id: string;
  productName: ProductName;
  productVersion: string;
  installationStatus: InstallationStatus;
  lastInstallationDate: Date | undefined;
  lastInstallationFailureReason: string | undefined;
  indexName?: string;
}

export interface ProductInstallState {
  status: InstallationStatus;
  version?: string;
}
