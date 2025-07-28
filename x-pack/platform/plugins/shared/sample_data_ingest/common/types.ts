/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentationProduct } from '@kbn/product-doc-common';

export type InstallationStatus = 'installed' | 'uninstalled' | 'installing' | 'error';

export interface StatusResponse {
  status: InstallationStatus;
  indexName?: string;
}

export interface InstallResponse {
  status: InstallationStatus;
  indexName: string;
}

export enum DatasetSampleType {
  elasticsearch = DocumentationProduct.elasticsearch,
}
